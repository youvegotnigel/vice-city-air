const express = require('express');
const { readCollection, writeCollection } = require('../utils/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const CODE_PATTERN = /^[A-Z]{3}$/;

router.get('/', (req, res) => {
  res.json({ airports: readCollection('airports') });
});

// POST /api/airports - admin only: add a new airport.
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { city, country } = req.body || {};
  const code = String(req.body?.code || '').trim().toUpperCase();

  if (!code || !city || !country) {
    return res.status(400).json({ error: 'code, city and country are required' });
  }
  if (!CODE_PATTERN.test(code)) {
    return res.status(400).json({ error: 'code must be exactly 3 letters (IATA code)' });
  }

  const airports = readCollection('airports');
  if (airports.some((a) => a.code === code)) {
    return res.status(409).json({ error: 'An airport with this code already exists' });
  }

  const airport = { code, city, country };
  airports.push(airport);
  writeCollection('airports', airports);
  res.status(201).json({ airport });
});

// PUT /api/airports/:code - admin only: edit an airport.
router.put('/:code', requireAuth, requireAdmin, (req, res) => {
  const currentCode = String(req.params.code).toUpperCase();
  const airports = readCollection('airports');
  const airport = airports.find((a) => a.code === currentCode);
  if (!airport) return res.status(404).json({ error: 'Airport not found' });

  const { city, country } = req.body || {};
  if (req.body?.code !== undefined) {
    const newCode = String(req.body.code).trim().toUpperCase();
    if (!CODE_PATTERN.test(newCode)) {
      return res.status(400).json({ error: 'code must be exactly 3 letters (IATA code)' });
    }
    if (newCode !== currentCode && airports.some((a) => a.code === newCode)) {
      return res.status(409).json({ error: 'An airport with this code already exists' });
    }
    airport.code = newCode;
  }
  if (city !== undefined) {
    if (!city) return res.status(400).json({ error: 'city cannot be empty' });
    airport.city = city;
  }
  if (country !== undefined) {
    if (!country) return res.status(400).json({ error: 'country cannot be empty' });
    airport.country = country;
  }

  writeCollection('airports', airports);
  res.json({ airport });
});

// DELETE /api/airports/:code - admin only: remove an airport.
router.delete('/:code', requireAuth, requireAdmin, (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const airports = readCollection('airports');
  const index = airports.findIndex((a) => a.code === code);
  if (index === -1) return res.status(404).json({ error: 'Airport not found' });
  airports.splice(index, 1);
  writeCollection('airports', airports);
  res.status(204).end();
});

module.exports = router;
