const path = require('path');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// INTENTIONAL BAD PRACTICE (see REQUIREMENTS.md, item B5):
// falls back to a hardcoded secret instead of refusing to start when
// JWT_SECRET is missing.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    '[security-warning] JWT_SECRET not set in environment - falling back to an insecure default. ' +
      'This is intentional demo behaviour, see REQUIREMENTS.md item B5.'
  );
}

module.exports = {
  NODE_ENV,
  isProduction,
  PORT: parseInt(process.env.PORT, 10) || 3000,
  JWT_SECRET,
  JWT_EXPIRES_IN: '2h',
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()),
  DATA_DIR: path.join(__dirname, 'data'),
  SEED_DIR: path.join(__dirname, 'data', 'seed'),
};
