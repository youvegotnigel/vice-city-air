const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const FILES = {
  users: 'users.json',
  flights: 'flights.json',
  bookings: 'bookings.json',
  airports: 'airports.json',
};

function filePath(name) {
  if (!FILES[name]) throw new Error(`Unknown data collection: ${name}`);
  return path.join(DATA_DIR, FILES[name]);
}

function readCollection(name) {
  const raw = fs.readFileSync(filePath(name), 'utf-8');
  return JSON.parse(raw);
}

function writeCollection(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(records) {
  return records.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

module.exports = { FILES, readCollection, writeCollection, nextId };
