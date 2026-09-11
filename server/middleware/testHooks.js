/**
 * In-memory chaos configuration used for performance / resilience testing.
 * Controlled via server/routes/test.js (POST /api/test/config).
 */
const chaosState = {
  latencyMs: 0, // artificial delay applied to every request
  errorRate: 0, // 0-1 probability of a request failing with a 500
};

/** Applied globally, before routes. Also allows a one-off per-request delay via ?delay=<ms>. */
function chaosMiddleware(req, res, next) {
  const queryDelay = parseInt(req.query.delay, 10);
  const delay = Number.isFinite(queryDelay) && queryDelay > 0 ? queryDelay : chaosState.latencyMs;

  const fail = chaosState.errorRate > 0 && Math.random() < chaosState.errorRate;

  const run = () => {
    if (fail) {
      return res.status(500).json({ error: 'Simulated failure (chaos testing mode enabled)' });
    }
    return next();
  };

  if (delay > 0) {
    setTimeout(run, delay);
  } else {
    run();
  }
}

module.exports = { chaosState, chaosMiddleware };
