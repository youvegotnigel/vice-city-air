const express = require('express');
const { readCollection, writeCollection, nextId } = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function withFlight(booking, flights) {
  const flight = flights.find((f) => f.id === booking.flightId) || null;
  return { ...booking, flight };
}

function formatRef(id) {
  return `BKG-${String(id).padStart(6, '0')}`;
}

// GET /api/bookings - good practice: results are scoped server-side to the
// requesting user (unless they are an admin, who may see everything).
router.get('/', requireAuth, (req, res) => {
  const flights = readCollection('flights');
  let bookings = readCollection('bookings');
  if (req.user.role !== 'admin') {
    bookings = bookings.filter((b) => b.userId === req.user.id);
  }
  bookings = bookings.map((b) => withFlight(b, flights));
  res.json({ bookings });
});

const MAX_SEATS_PER_BOOKING = 9; // matches the common airline "book up to 9 at once" rule

// POST /api/bookings - create + pay for a booking (one or more seats) in one step.
router.post('/', requireAuth, (req, res) => {
  const { flightId, seats, passengerName, specialRequests, payment } = req.body || {};

  if (!flightId || !Array.isArray(seats) || seats.length === 0 || !passengerName) {
    return res.status(400).json({ error: 'flightId, seats (a non-empty array) and passengerName are required' });
  }
  if (seats.length > MAX_SEATS_PER_BOOKING) {
    return res.status(400).json({ error: `You can book at most ${MAX_SEATS_PER_BOOKING} seats per booking` });
  }
  const uniqueSeats = [...new Set(seats)];
  if (uniqueSeats.length !== seats.length) {
    return res.status(400).json({ error: 'Duplicate seat in selection' });
  }
  if (!payment || !payment.cardNumber || !payment.expiry || !payment.cvv) {
    return res.status(400).json({ error: 'payment (cardNumber, expiry, cvv) is required' });
  }
  if (!/^\d{13,19}$/.test(String(payment.cardNumber).replace(/\s+/g, ''))) {
    return res.status(400).json({ error: 'cardNumber must be 13-19 digits' });
  }
  if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) {
    return res.status(400).json({ error: 'expiry must be in MM/YY format' });
  }
  if (!/^\d{3,4}$/.test(String(payment.cvv))) {
    return res.status(400).json({ error: 'cvv must be 3-4 digits' });
  }

  const flights = readCollection('flights');
  const flight = flights.find((f) => f.id === Number(flightId));
  if (!flight) return res.status(404).json({ error: 'Flight not found' });
  if (flight.status === 'cancelled') return res.status(400).json({ error: 'This flight has been cancelled and cannot be booked' });

  const validRow = Math.ceil(flight.capacity / 4);
  const invalidSeat = seats.find((s) => !/^([1-9][0-9]?)[A-D]$/.test(s) || Number(s.slice(0, -1)) > validRow);
  if (invalidSeat) return res.status(400).json({ error: `Invalid seat for this flight: ${invalidSeat}` });

  const bookings = readCollection('bookings');
  const alreadyTaken = seats.filter((s) => bookings.some((b) => b.flightId === flight.id && b.status === 'confirmed' && b.seats.includes(s)));
  if (alreadyTaken.length > 0) {
    return res.status(409).json({ error: `Seat(s) already booked on this flight: ${alreadyTaken.join(', ')}` });
  }

  const id = nextId(bookings);
  const cardNumber = String(payment.cardNumber).replace(/\s+/g, '');
  const booking = {
    id,
    bookingReference: formatRef(id),
    userId: req.user.id,
    flightId: flight.id,
    seats,
    passengerName,
    // NOTE: rendered unsanitized in the admin bookings view on the frontend -
    // see REQUIREMENTS.md item B3 (stored XSS).
    specialRequests: specialRequests || '',
    status: 'confirmed',
    payment: {
      cardLast4: cardNumber.slice(-4),
      amount: flight.price * seats.length,
      currency: flight.currency,
      paidAt: new Date().toISOString(),
      receiptId: `RCPT-${String(id).padStart(6, '0')}`,
    },
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  };
  bookings.push(booking);
  writeCollection('bookings', bookings);
  res.status(201).json({ booking: withFlight(booking, flights) });
});

// GET /api/bookings/:id - single booking lookup.
//
// INTENTIONAL BAD PRACTICE (see REQUIREMENTS.md, item B1 - Broken Access
// Control / IDOR): any authenticated user can fetch ANY booking by
// incrementing the numeric id, because ownership (booking.userId ===
// req.user.id) is never checked for non-admins. Contrast with GET
// /api/bookings above, which correctly scopes the list to the caller.
router.get('/:id', requireAuth, (req, res) => {
  const flights = readCollection('flights');
  const bookings = readCollection('bookings');
  const booking = bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: withFlight(booking, flights) });
});

// PUT /api/bookings/:id/cancel - cancel a booking.
//
// Same INTENTIONAL IDOR gap as GET /:id above (item B1): no ownership check.
router.put('/:id/cancel', requireAuth, (req, res) => {
  const bookings = readCollection('bookings');
  const booking = bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking is already cancelled' });

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  writeCollection('bookings', bookings);

  const flights = readCollection('flights');
  res.json({ booking: withFlight(booking, flights) });
});

// GET /api/bookings/:id/receipt - printable receipt data (inherits the same
// ownership gap as GET /:id, see item B1).
router.get('/:id/receipt', requireAuth, (req, res) => {
  const flights = readCollection('flights');
  const bookings = readCollection('bookings');
  const booking = bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: withFlight(booking, flights) });
});

module.exports = router;
