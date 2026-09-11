const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { readCollection } = require('../utils/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Good practice (G5): rate limit the login endpoint to slow down brute-force
// / credential-stuffing attempts.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const users = readCollection('users');
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  // Good practice (G1): passwords are hashed with bcrypt; compare with bcrypt.compareSync
  // rather than storing/comparing plaintext. Generic error message avoids
  // confirming whether the email exists.
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const users = readCollection('users');
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(user) });
});

module.exports = router;
