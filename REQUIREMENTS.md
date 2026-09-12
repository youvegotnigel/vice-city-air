# Requirements. Vice City Air (Flight Reservation Demo App)

## 1. Purpose

This is a small, self-contained flight reservation web application built
specifically to act as an **AUT (Application Under Test)** for test
automation practice and demos across five disciplines:

- **UI testing** (Selenium / Playwright / Cypress, etc.)
- **API testing** (Postman, RestAssured, Supertest, etc.)
- **Accessibility testing** (axe-core, Lighthouse, WAVE, etc.)
- **Security testing** (OWASP ZAP, Burp Suite, manual pentesting)
- **Performance testing** (k6, JMeter, Gatling, etc.)

It is **not** a real airline system: all data is fake, stored in flat JSON
files, and there is no real payment processing.

## 2. Tech Stack

- Backend: Node.js + Express, REST JSON API
- Frontend: Vanilla HTML/CSS/JavaScript single-page app (hash-based routing,
  no build step, no frontend framework)
- Data storage: flat JSON files under `server/data/` (no database)
- Auth: JWT bearer tokens

## 3. User Roles

| Role | Description |
|---|---|
| **Admin** | Super user. Can manage flights (add/edit/delete), manage airports (add/edit/delete), manage users (add/edit/delete passengers and admins), and view booking/revenue statistics. Can also search and book flights like a passenger. |
| **Passenger** | Normal user. Can search flights, book a flight (seat selection + mock payment), view their own booking history, view/print receipts, and cancel their own bookings. |

Admin accounts are only created by another admin (or via the seed data).
There is no public self-registration.

## 4. Functional Requirements

### 4.1 Authentication
- F1. Users log in with email + password (`POST /api/auth/login`).
- F2. Sessions are JWT-based (2 hour expiry), sent as `Authorization: Bearer <token>`.
- F3. The UI shows/hides navigation based on the logged-in role (guest / passenger / admin).

### 4.2 Flight Search (Passenger & Admin)
- F4. Anyone (including logged-out visitors) can search flights by origin, destination, date and max price.
- F5. Search results show airline, route, schedule, duration, live seat availability, price and status (on-time / delayed / cancelled).

### 4.3 Booking (Passenger & Admin)
- F6. A logged-in user can view a flight's seat map and select one or more available seats to book together in a single transaction (up to 9 per booking, matching a typical airline limit).
- F7. Booking requires passenger name, optional special requests, and mock payment details (card number, expiry, CVV). The total charged is the flight's price multiplied by the number of seats selected.
- F8. Seats cannot be double-booked; basic server-side validation is applied to all booking fields, including rejecting duplicate seats within the same request and requests over the 9-seat limit.
- F9. On success, a receipt is generated and shown, listing every seat booked and the combined total, with a print/"save as PDF" option (via the browser's print dialog).

### 4.4 Booking Management (Passenger & Admin)
- F10. A user can view their own booking history ("My Bookings").
- F11. A user can cancel a confirmed booking.
- F12. A user can re-view/re-print the receipt for any of their bookings.

### 4.5 Admin. Flight Management
- F13. Admin can add a new flight (route, schedule, price, capacity, description, status, airline/logo).
- F14. Admin can edit an existing flight's details, including marking it delayed/cancelled.
- F15. Admin can delete a flight.

### 4.6 Admin. Airport Management
- F16. Admin can add a new airport (IATA code, city, country), stored in `server/data/airports.json` and immediately available in the origin/destination pickers used by flight search and flight add/edit.
- F17. Admin can edit an existing airport's code/city/country.
- F18. Admin can delete an airport. (Deleting an airport does not touch flights that already reference its code/city/country as origin/destination, since that data is copied onto the flight record at creation time, not looked up live.)
- F19. IATA codes are validated server-side (exactly 3 letters, uppercased) and must be unique; duplicate or malformed codes are rejected.

### 4.8 Admin. User Management
- F20. Admin can add new passenger or admin accounts.
- F21. Admin can edit a user's profile, role, or reset their password.
- F22. Admin can delete a user (except their own currently-logged-in account).

### 4.9 Admin. Dashboard
- F23. Admin dashboard shows: total flights, flights by status, total/confirmed/cancelled bookings, total revenue, total passengers, and top destinations by confirmed bookings.
- F24. Admin dashboard lists recent bookings, including each booking's free-text "special requests" field (see security note B3).

## 5. Test-Automation-Friendly Features

These exist purely to make automated testing easier and are not something a
"real" production airline app would ship as-is.

- T1. **`data-testid` attributes** on every interactive element (buttons, inputs, links, rows) for stable UI locators.
- T2. **OpenAPI/Swagger docs** at `/api-docs`, spec at `/api/openapi.json`, for API test tooling (Postman can import the JSON directly).
- T3. **Test data reset endpoint**. `POST /api/test/reset` restores `server/data/*.json` to the original seed state (see `server/utils/seed.js`), so test suites can start from a known baseline. Disabled automatically when `NODE_ENV=production`.
- T4. **Configurable latency/error injection** for performance and resilience testing:
  - `GET/POST /api/test/config`. Get/set a global `latencyMs` (artificial delay applied to every request) and `errorRate` (0-1 probability any request returns HTTP 500).
  - A one-off per-request delay can also be added via `?delay=<ms>` on any request, without changing global config.
  - Also disabled when `NODE_ENV=production`.
- T5. A public `GET /api/health` endpoint for uptime/smoke checks.
- T6. Semantic HTML, labelled form fields, a skip-to-content link, visible focus states and AA-contrast colors to support accessibility test tooling.

## 6. Security Posture (for Security Test Automation)

This app intentionally mixes **good security practices** with a small,
clearly documented set of **bad practices / vulnerabilities**, so that a
security-testing exercise has both things that *should* pass a check and
things that *should* fail one. Roughly 3/4 of the relevant behaviors follow
good practice; the remainder are intentional gaps, listed below. Nothing in
this section is accidental. Treat this table as the "answer key."

### 6.1 Good practices implemented (expect these checks to PASS)

| ID | Practice | Where |
|---|---|---|
| G1 | Passwords are hashed with bcrypt (cost factor 10), never stored or compared as plaintext | `server/routes/auth.js`, `server/routes/users.js` |
| G2 | JWT auth tokens expire after 2 hours and are verified server-side on every protected route | `server/middleware/auth.js` |
| G3 | Role-based access control (RBAC) is enforced server-side on admin-only routes (with one documented exception, B2) | `server/middleware/auth.js` (`requireAdmin`) |
| G4 | Security response headers are set via Helmet (`X-Content-Type-Options`, `X-Frame-Options`, etc.) | `server/index.js` |
| G5 | The login endpoint is rate-limited (10 attempts / 5 minutes per IP) to slow brute-force attempts | `server/routes/auth.js` |
| G6 | Server-side input validation on booking/payment/flight/user endpoints (required fields, formats, ranges, seat-collision checks) | `server/routes/bookings.js`, `server/routes/flights.js`, `server/routes/users.js` |
| G7 | CORS is restricted to an explicit origin allowlist rather than `*` | `server/index.js`, `server/config.js` (`CORS_ORIGIN`) |
| G8 | Almost all user-supplied text is escaped before being rendered (`Utils.escapeHtml`) to prevent stored/reflected XSS. The one documented exception is B3 | `public/js/utils.js`, used throughout `public/js/views.js` and `public/js/admin.js` |
| G9 | Secrets (JWT signing secret) are read from environment variables via `.env`, not hardcoded in source, and `.env` is git-ignored | `server/config.js`, `.env.example` |
| G10 | `GET /api/bookings` (list) correctly scopes results to the logged-in user unless they are an admin | `server/routes/bookings.js` |
| G11 | The full credit card number is never stored. Only the last 4 digits are persisted | `server/routes/bookings.js` |

### 6.2 Intentional bad practices / vulnerabilities (expect these checks to FAIL)

| ID | OWASP category | Vulnerability | Where | Notes for testers |
|---|---|---|---|---|
| B1 | A01:2021 Broken Access Control (IDOR) | `GET /api/bookings/:id`, `PUT /api/bookings/:id/cancel`, and `GET /api/bookings/:id/receipt` check that the caller is authenticated, but never check that the booking actually belongs to them. Any logged-in passenger can view, cancel, or read the receipt for **any** booking by guessing/incrementing the numeric id. | `server/routes/bookings.js` | Contrast with `GET /api/bookings` (list), which correctly scopes to the caller (G10). The bug is specifically on the single-resource routes. |
| B2 | A01:2021 Broken Access Control | `PUT /api/flights/:id` (edit flight) is protected by `requireAuth` but is missing the `requireAdmin` check that every other flight-mutating route has. Any authenticated passenger can call it directly (e.g. via curl/Postman) even though the "Edit" button is hidden for passengers in the UI. | `server/routes/flights.js` | Classic "missing middleware on one route" bug. `POST`/`DELETE /api/flights` correctly require admin. |
| B3 | A03:2021 Injection (Stored XSS) | A booking's `specialRequests` field is free text supplied by the passenger at booking time. It is rendered into the admin dashboard's "Recent Bookings" table using raw `innerHTML` instead of `Utils.escapeHtml`. A malicious passenger can submit a `<script>`/HTML payload as their special request and have it execute in an **admin's** browser session next time they view the dashboard. | `public/js/admin.js` (`renderDashboard`), booking created via `server/routes/bookings.js` | Because the JWT is kept in `localStorage` (see note in `public/js/state.js`), a successful XSS payload here can be used to exfiltrate the admin's auth token. |
| B4 | A02:2021 Sensitive Data Exposure | `GET /api/users` (admin user list) returns the full user record **including the bcrypt `passwordHash` field** to the client. A hardened API should never serialize password hashes to any client, even a trusted admin UI. | `server/routes/users.js` | Visible directly in the network response/dev tools when logged in as admin. |
| B5 | A05:2021 Security Misconfiguration / Information Disclosure | The global error handler returns the raw error message and full stack trace (plus the request path) in the JSON response body for any unhandled server error, instead of a generic message. Also, `JWT_SECRET` silently falls back to a hardcoded default (`dev-secret-change-me`) if not set via environment variable, rather than refusing to start. | `server/middleware/errorHandler.js`, `server/config.js` | The fallback secret is logged as a console warning on startup, but does not block the app from running. |

### 6.3 Known simplifications (not treated as vulnerabilities)

- Logout is client-side only (the token is simply discarded); there is no server-side token revocation/blacklist, since the API is intentionally stateless. This is a standard JWT trade-off, not a bug.
- Payment processing is entirely mocked. No real card is charged or validated against a payment gateway, only basic format checks are performed.

## 7. Data Model (JSON files under `server/data/`)

- **`users.json`**. `id, role (admin|passenger), name, email, passwordHash, passportNumber, createdAt`
- **`airports.json`**. `code, city, country`
- **`flights.json`**. `id, flightNumber, airline, airlineLogo, origin, destination, departureTime, arrivalTime, durationMinutes, price, currency, capacity, status (on-time|delayed|cancelled), description, image, createdAt, updatedAt`
- **`bookings.json`**. `id, bookingReference, userId, flightId, seats (array of 1-9 seat labels), passengerName, specialRequests, status (confirmed|cancelled), payment { cardLast4, amount (price × seats.length), currency, paidAt, receiptId }, createdAt, cancelledAt`

`POST /api/test/reset` (and `npm run seed`) regenerate all of the above
from scratch, giving a known starting point with timestamps relative to
the current time.

## 8. API Endpoints

See the interactive Swagger UI at `/api-docs` (or the raw spec at
`/api/openapi.json`) for the authoritative, up-to-date list with request/response
shapes. Summary:

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | none |
| POST | `/api/auth/login` | none |
| GET | `/api/auth/me` | user |
| GET | `/api/airports` | none |
| POST | `/api/airports` | admin |
| PUT | `/api/airports/:code` | admin |
| DELETE | `/api/airports/:code` | admin |
| GET | `/api/flights` | none |
| POST | `/api/flights` | admin |
| GET | `/api/flights/:id` | none |
| PUT | `/api/flights/:id` | user *(see B2)* |
| DELETE | `/api/flights/:id` | admin |
| GET | `/api/bookings` | user |
| POST | `/api/bookings` | user |
| GET | `/api/bookings/:id` | user *(see B1)* |
| PUT | `/api/bookings/:id/cancel` | user *(see B1)* |
| GET | `/api/bookings/:id/receipt` | user *(see B1)* |
| GET | `/api/users` | admin |
| POST | `/api/users` | admin |
| PUT | `/api/users/:id` | admin |
| DELETE | `/api/users/:id` | admin |
| GET | `/api/dashboard/stats` | admin |
| POST | `/api/test/reset` | none (disabled in production) |
| GET/POST | `/api/test/config` | none (disabled in production) |

## 9. Out of Scope

- Real payment gateway integration
- Real email/SMS notifications
- Multi-language / i18n
- Multi-currency
- Database (JSON files are used deliberately, for a simple, portable AUT)
- Server-side token revocation / refresh tokens
