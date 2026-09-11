const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const { PORT, CORS_ORIGIN, DATA_DIR } = require('./config');
const { chaosMiddleware } = require('./middleware/testHooks');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { seed } = require('./utils/seed');
const openapiDoc = require('./openapi.json');
const { version: APP_VERSION } = require('../package.json');

// Keep the served OpenAPI doc's version in sync with package.json rather
// than letting the two drift apart.
openapiDoc.info.version = APP_VERSION;

const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const airportRoutes = require('./routes/airports');
const dashboardRoutes = require('./routes/dashboard');
const testRoutes = require('./routes/test');

// First run: generate demo data if it doesn't exist yet.
if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
  seed();
}

const app = express();

// Good practice (G4): sensible security headers via helmet.
app.use(helmet({ contentSecurityPolicy: false }));

// Good practice (G7): explicit CORS origin allowlist instead of a wildcard.
app.use(cors({ origin: CORS_ORIGIN }));

app.use(express.json());
app.use(chaosMiddleware);

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: APP_VERSION, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/airports', airportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test', testRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get('/api/openapi.json', (req, res) => res.json(openapiDoc));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Flight Reservation Demo App listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
});
