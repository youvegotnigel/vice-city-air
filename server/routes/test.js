const express = require('express');
const { isProduction } = require('../config');
const { seed } = require('../utils/seed');
const { chaosState } = require('../middleware/testHooks');

const router = express.Router();

// All /api/test/* endpoints are disabled in production so they can never
// leak into a "real" deployment - they exist purely to support automated
// UI/API/performance test suites in dev/demo environments (see README.md).
router.use((req, res, next) => {
  if (isProduction) {
    return res.status(403).json({ error: '/api/test endpoints are disabled when NODE_ENV=production' });
  }
  return next();
});

// POST /api/test/reset - restore all JSON data files to their seeded state.
// Call this before/after test suites to guarantee a known starting point.
router.post('/reset', (req, res) => {
  seed();
  chaosState.latencyMs = 0;
  chaosState.errorRate = 0;
  res.json({ status: 'ok', message: 'Data reset to seed state, chaos config cleared' });
});

// GET /api/test/config - read the current chaos-testing configuration.
router.get('/config', (req, res) => {
  res.json(chaosState);
});

// POST /api/test/config - set artificial latency (ms) and/or error rate
// (0-1) applied to every subsequent API request. Useful for performance and
// resilience/negative testing.
router.post('/config', (req, res) => {
  const { latencyMs, errorRate } = req.body || {};
  if (latencyMs !== undefined) {
    if (typeof latencyMs !== 'number' || latencyMs < 0 || latencyMs > 10000) {
      return res.status(400).json({ error: 'latencyMs must be a number between 0 and 10000' });
    }
    chaosState.latencyMs = latencyMs;
  }
  if (errorRate !== undefined) {
    if (typeof errorRate !== 'number' || errorRate < 0 || errorRate > 1) {
      return res.status(400).json({ error: 'errorRate must be a number between 0 and 1' });
    }
    chaosState.errorRate = errorRate;
  }
  res.json(chaosState);
});

module.exports = router;
