const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/** Requires a valid Bearer token; attaches decoded { id, role, email } to req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Requires req.user.role === 'admin'. Must run after requireAuth. */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
