# Vice City Air. Flight Reservation Demo App

*A GTA VI-inspired neon reskin, done purely for the memes. Not affiliated with or endorsed by Rockstar Games/Take-Two.*

A small, self-contained flight reservation web app used as an **AUT
(Application Under Test)** for practicing/demoing UI, API, accessibility,
security and performance test automation.

- Vanilla HTML/CSS/JS frontend (no build step) + Node/Express JSON API
- All data lives in flat JSON files under `server/data/`. No database required
- No paid or advanced third-party services; everything runs fully offline

See [REQUIREMENTS.md](REQUIREMENTS.md) for the full feature list, data
model, and API reference. Importantly, it also documents the list of
intentional "good" vs "bad" security practices this app ships with for
security-test-automation purposes.

## Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@flightdemo.com` | `Admin@123` |
| Passenger | `lucia.caminos@example.com` | `Passenger@123` |
| Passenger | `jason.duval@example.com` | `Passenger@123` |
| Passenger | `cal.hampton@example.com` | `Passenger@123` |

These are also shown on the login page itself.

## Run locally with npm

Requires Node.js 18+.

```bash
npm install
npm run seed     # generates server/data/*.json demo data (auto-runs on first `npm start` too)
npm start
```

The app is served at **http://localhost:3000**. For auto-reload during
development, use `npm run dev` instead of `npm start` (requires the
`nodemon` dev dependency, already included).

### Stopping the server

`npm start` runs in the foreground, so the usual way to stop it is **Ctrl+C**
in that terminal. If it ends up running in the background instead (or its
terminal was closed without stopping it first, which can leave the process
running on Windows), free the port with:

```bash
npm run stop
```

This kills whatever is listening on port 3000 (via the `kill-port` package).
If you changed `PORT` in your `.env`, stop that port directly instead:
`npx kill-port <port>`.

## Run with Docker

```bash
docker build -t flight-reservation-demo .
docker run --rm -p 3000:3000 flight-reservation-demo
```

Then open **http://localhost:3000**.

By default the container runs with `NODE_ENV=development` so the
test-automation hooks below stay available out of the box. To see them
disabled (as they would be in a real deployment), run:

```bash
docker run --rm -p 3000:3000 -e NODE_ENV=production flight-reservation-demo
```

### Run with Docker Compose

`docker-compose.yml` wires up the same environment variables as `.env.example`
plus a bind mount so `server/data` persists across container restarts:

```bash
docker compose up --build
```

Then open **http://localhost:3000**. Copy `.env.example` to `.env` first to
override any of `PORT`, `NODE_ENV`, `JWT_SECRET`, or `CORS_ORIGIN` — Compose
picks up a `.env` file in the project root automatically. Stop with
`docker compose down` (or `Ctrl+C` if running in the foreground).

## Configuration

Copy `.env.example` to `.env` to override defaults:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `development` | `production` disables the `/api/test/*` automation hooks |
| `JWT_SECRET` | *(insecure default, see REQUIREMENTS.md item B5)* | Secret used to sign auth tokens. Set a real value for anything beyond local demo use |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated list of allowed CORS origins |

## Features at a Glance

- Flight search (no login required) with origin/destination/date/price filters
- Seat selection (single or multiple seats in one booking, up to 9), mock payment, and receipt generation (printable)
- Booking history and self-service cancellation
- Admin: manage flights (add/edit/delete, mark delayed/cancelled), manage
  airports (add/edit/delete), manage users (add/edit/delete), and a stats
  dashboard (bookings, revenue, top destinations)

Full details in [REQUIREMENTS.md](REQUIREMENTS.md).

## Built for Test Automation

- **UI**: every interactive element carries a `data-testid` attribute (see
  browser dev tools or the source under `public/js/`).
- **API**: interactive OpenAPI/Swagger docs at
  [`/api-docs`](http://localhost:3000/api-docs) (spec JSON at
  `/api/openapi.json`, importable directly into Postman).
- **Test data control**: `POST /api/test/reset` restores all JSON data to
  its original seeded state. Call this before/after test runs. Disabled
  when `NODE_ENV=production`.
- **Performance/resilience**: `GET`/`POST /api/test/config` sets a global
  simulated `latencyMs` and/or `errorRate` (0–1) applied to every API
  request; or add `?delay=500` to any single request for a one-off delay.
  Disabled when `NODE_ENV=production`.
- **Accessibility**: semantic HTML, labelled form controls, a skip-to-content
  link, visible focus outlines, and AA-contrast colors throughout.
- **Security**: a deliberate, documented mix of good practices and known
  vulnerabilities. See the "Security Posture" section of
  [REQUIREMENTS.md](REQUIREMENTS.md) for the full list (used to write tests
  that are expected to pass vs. expected to fail/flag an issue).

## Project Structure

```
server/           Express API
  routes/         auth, flights, bookings, users, airports, dashboard, test hooks
  middleware/      auth (JWT), error handler, chaos/test-hook middleware
  data/            JSON "database" files (live data)
  data/seed/       pristine copy restored by POST /api/test/reset
  utils/seed.js    generates the demo data (npm run seed)
public/           Static single-page frontend (no build step)
  js/             api.js, state.js, utils.js, views.js (passenger), admin.js, router.js, app.js
  css/styles.css
  images/         generated SVG placeholder airline logos / destination art
```

## Resetting Demo Data

Data files are mutated as you use the app (new bookings, edited flights,
etc). To restore the original demo data:

```bash
curl -X POST http://localhost:3000/api/test/reset
```

or simply re-run `npm run seed`.
