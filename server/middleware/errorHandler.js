/**
 * INTENTIONAL BAD PRACTICE (see REQUIREMENTS.md, item B5 - Security
 * Misconfiguration / Information Disclosure): raw error details, including
 * the stack trace, are returned to the client instead of a generic message.
 * A "hardened" implementation would log the stack server-side only and
 * return a generic { error: 'Internal server error' } body.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: err.stack,
    path: req.originalUrl,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
