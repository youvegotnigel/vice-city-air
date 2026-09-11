const express = require('express');
const { readCollection } = require('../utils/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const flights = readCollection('flights');
  const bookings = readCollection('bookings');
  const users = readCollection('users');

  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');
  const revenue = confirmed.reduce((sum, b) => sum + (b.payment ? b.payment.amount : 0), 0);

  const destinationCounts = {};
  for (const b of confirmed) {
    const flight = flights.find((f) => f.id === b.flightId);
    if (!flight) continue;
    const key = `${flight.destination.city} (${flight.destination.code})`;
    destinationCounts[key] = (destinationCounts[key] || 0) + 1;
  }
  const topDestinations = Object.entries(destinationCounts)
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalFlights: flights.length,
    flightsByStatus: {
      'on-time': flights.filter((f) => f.status === 'on-time').length,
      delayed: flights.filter((f) => f.status === 'delayed').length,
      cancelled: flights.filter((f) => f.status === 'cancelled').length,
    },
    totalBookings: bookings.length,
    confirmedBookings: confirmed.length,
    cancelledBookings: cancelled.length,
    totalRevenue: revenue,
    totalUsers: users.length,
    totalPassengers: users.filter((u) => u.role === 'passenger').length,
    topDestinations,
  });
});

module.exports = router;
