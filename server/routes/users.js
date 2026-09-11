const express = require('express');
const bcrypt = require('bcryptjs');
const { readCollection, writeCollection, nextId } = require('../utils/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - admin only: list all accounts.
//
// INTENTIONAL BAD PRACTICE (see REQUIREMENTS.md, item B4 - Sensitive Data
// Exposure): the bcrypt password hash is included in the response instead
// of being stripped out. A hardened implementation should NEVER serialize
// passwordHash to any client, even a trusted admin UI.
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const users = readCollection('users');
  res.json({ users });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, email, password, role, passportNumber } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required' });
  }
  if (!['admin', 'passenger'].includes(role)) {
    return res.status(400).json({ error: 'role must be "admin" or "passenger"' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const users = readCollection('users');
  if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const user = {
    id: nextId(users),
    role,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    passportNumber: passportNumber || '',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeCollection('users', users);
  const { passwordHash, ...publicUser } = user;
  res.status(201).json({ user: publicUser });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const users = readCollection('users');
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, email, role, passportNumber, password } = req.body || {};
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) {
    if (!['admin', 'passenger'].includes(role)) return res.status(400).json({ error: 'role must be "admin" or "passenger"' });
    user.role = role;
  }
  if (passportNumber !== undefined) user.passportNumber = passportNumber;
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
    user.passwordHash = bcrypt.hashSync(password, 10);
  }

  writeCollection('users', users);
  const { passwordHash, ...publicUser } = user;
  res.json({ user: publicUser });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const users = readCollection('users');
  const index = users.findIndex((u) => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  if (users[index].id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  users.splice(index, 1);
  writeCollection('users', users);
  res.status(204).end();
});

module.exports = router;
