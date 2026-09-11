const express = require('express');
const { readCollection, writeCollection, nextId } = require('../utils/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function occupiedSeats(flightId) {
  const bookings = readCollection('bookings');
  return bookings.filter((b) => b.flightId === flightId && b.status === 'confirmed').flatMap((b) => b.seats);
}

function seatMap(flight) {
  const rows = flight.capacity / 4;
  const taken = new Set(occupiedSeats(flight.id));
  const seats = [];
  for (let r = 1; r <= rows; r += 1) {
    for (const col of ['A', 'B', 'C', 'D']) {
      const label = `${r}${col}`;
      seats.push({ label, taken: taken.has(label) });
    }
  }
  return seats;
}

// GET /api/flights - public flight search (no auth required, mirrors a
// typical airline "search flights" page that doesn't require sign in).
router.get('/', (req, res) => {
  const { origin, destination, date, maxPrice, status } = req.query;
  let flights = readCollection('flights');

  if (origin) flights = flights.filter((f) => f.origin.code.toLowerCase() === String(origin).toLowerCase());
  if (destination) flights = flights.filter((f) => f.destination.code.toLowerCase() === String(destination).toLowerCase());
  if (date) flights = flights.filter((f) => f.departureTime.slice(0, 10) === date);
  if (maxPrice) flights = flights.filter((f) => f.price <= Number(maxPrice));
  if (status) flights = flights.filter((f) => f.status === status);

  flights = flights.map((f) => ({ ...f, availableSeats: f.capacity - occupiedSeats(f.id).length }));
  res.json({ flights });
});

router.get('/:id', (req, res) => {
  const flights = readCollection('flights');
  const flight = flights.find((f) => f.id === Number(req.params.id));
  if (!flight) return res.status(404).json({ error: 'Flight not found' });
  res.json({ flight: { ...flight, seats: seatMap(flight) } });
});

// POST /api/flights - admin only: add a new flight.
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { flightNumber, airline, airlineLogo, origin, destination, departureTime, arrivalTime, durationMinutes, price, capacity, status, description, image } =
    req.body || {};

  if (!flightNumber || !airline || !origin || !destination || !departureTime || !price) {
    return res.status(400).json({ error: 'flightNumber, airline, origin, destination, departureTime and price are required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }

  const flights = readCollection('flights');
  const flight = {
    id: nextId(flights),
    flightNumber,
    airline,
    airlineLogo: airlineLogo || '/images/airlines/vicecity.svg',
    origin,
    destination,
    departureTime,
    arrivalTime: arrivalTime || departureTime,
    durationMinutes: durationMinutes || 0,
    price,
    currency: 'USD',
    capacity: capacity || 24,
    status: status || 'on-time',
    description: description || '',
    image: image || '/images/destinations/default.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  flights.push(flight);
  writeCollection('flights', flights);
  res.status(201).json({ flight });
});

// PUT /api/flights/:id - edit flight details (price, description, status, schedule, etc).
//
// INTENTIONAL BAD PRACTICE (see REQUIREMENTS.md, item B2 - Broken Access
// Control): this route is only guarded by requireAuth, NOT requireAdmin, so
// any authenticated passenger can call it directly (the "Edit" UI button is
// merely hidden for passengers on the frontend). Contrast with POST/DELETE
// on this same resource, which correctly enforce requireAdmin.
router.put('/:id', requireAuth, (req, res) => {
  const flights = readCollection('flights');
  const flight = flights.find((f) => f.id === Number(req.params.id));
  if (!flight) return res.status(404).json({ error: 'Flight not found' });

  const editable = ['flightNumber', 'airline', 'airlineLogo', 'origin', 'destination', 'departureTime', 'arrivalTime', 'durationMinutes', 'price', 'capacity', 'status', 'description', 'image'];
  for (const key of editable) {
    if (req.body && req.body[key] !== undefined) flight[key] = req.body[key];
  }
  flight.updatedAt = new Date().toISOString();
  writeCollection('flights', flights);
  res.json({ flight });
});

// DELETE /api/flights/:id - admin only: remove a flight.
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const flights = readCollection('flights');
  const index = flights.findIndex((f) => f.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Flight not found' });
  flights.splice(index, 1);
  writeCollection('flights', flights);
  res.status(204).end();
});

module.exports = router;
