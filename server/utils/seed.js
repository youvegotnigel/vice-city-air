/**
 * Generates fresh demo data (users, airports, flights, bookings) into
 * server/data/*.json. POST /api/test/reset calls this same function to
 * restore a known starting point (with freshly-relative timestamps).
 *
 * Run with: npm run seed
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { DATA_DIR } = require('../config');

const DAY = 24 * 60 * 60 * 1000;

function iso(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

const airports = [
  { code: 'JFK', city: 'New York', country: 'USA' },
  { code: 'LHR', city: 'London', country: 'United Kingdom' },
  { code: 'CDG', city: 'Paris', country: 'France' },
  { code: 'DXB', city: 'Dubai', country: 'UAE' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore' },
  { code: 'SYD', city: 'Sydney', country: 'Australia' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA' },
  { code: 'HND', city: 'Tokyo', country: 'Japan' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany' },
  { code: 'CMB', city: 'Colombo', country: 'Sri Lanka' },
];

function airport(code) {
  return airports.find((a) => a.code === code);
}

function image(code) {
  return `/images/destinations/${code.toLowerCase()}.svg`;
}

const airlines = [
  { name: 'Vice City Air', logo: '/images/airlines/vicecity.svg' },
  { name: 'Pacific Air', logo: '/images/airlines/pacific.svg' },
  { name: 'AeroWave', logo: '/images/airlines/aerowave.svg' },
  { name: 'Northern Wings', logo: '/images/airlines/northern.svg' },
  { name: 'Continental Express', logo: '/images/airlines/continental.svg' },
];

const CAPACITY = 24; // 6 rows x 4 seats (A-D)

function buildFlight(id, flightNumber, airlineIdx, originCode, destCode, departOffset, durationMinutes, price, status, description) {
  const airline = airlines[airlineIdx];
  const origin = airport(originCode);
  const destination = airport(destCode);
  const departureTime = iso(departOffset);
  const arrivalTime = new Date(new Date(departureTime).getTime() + durationMinutes * 60000).toISOString();
  return {
    id,
    flightNumber,
    airline: airline.name,
    airlineLogo: airline.logo,
    origin,
    destination,
    departureTime,
    arrivalTime,
    durationMinutes,
    price,
    currency: 'USD',
    capacity: CAPACITY,
    status,
    description,
    image: image(destCode),
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-1 * DAY),
  };
}

const flights = [
  buildFlight(1, 'SL101', 0, 'JFK', 'LHR', 2 * DAY, 420, 480, 'on-time', "Red-eye run from the city that never sleeps to the one that pretends it does. Complimentary meals, no questions about the carry-on."),
  buildFlight(2, 'PA202', 1, 'LHR', 'CDG', 3 * DAY, 90, 120, 'on-time', "Quick hop across the Channel, perfect for a weekend you'll swear you spent \"working from home.\""),
  buildFlight(3, 'AW303', 2, 'CDG', 'DXB', 4 * DAY, 390, 560, 'delayed', 'Non-stop to Dubai, extra legroom economy for the extra gold chains you\'re about to buy.'),
  buildFlight(4, 'NW404', 3, 'DXB', 'SIN', 5 * DAY, 435, 610, 'on-time', "Award-winning cabin crew, suspiciously good seasonal fare to Singapore. Ask no questions, get told no lies."),
  buildFlight(5, 'CE505', 4, 'SIN', 'SYD', 6 * DAY, 480, 590, 'on-time', 'Daily run down to Sydney, keeping the Vice City-to-Bondi pipeline open.'),
  buildFlight(6, 'SL606', 0, 'LAX', 'HND', 2.5 * DAY, 660, 720, 'on-time', 'Trans-Pacific run on our newest bird. Leather seats, neon reading lights, zero judgment.'),
  buildFlight(7, 'PA707', 1, 'HND', 'SIN', 7 * DAY, 420, 430, 'cancelled', "Regional service, temporarily grounded for \"scheduled maintenance.\" Definitely maintenance."),
  buildFlight(8, 'AW808', 2, 'FRA', 'JFK', 3.5 * DAY, 540, 540, 'on-time', "Frankfurt to JFK, our best-selling getaway route. Fares flexible enough for a very sudden vacation."),
  buildFlight(9, 'NW909', 3, 'CMB', 'LAX', 5.5 * DAY, 600, 650, 'delayed', "The long haul from Colombo to LAX. Bring snacks, bring patience, bring sunglasses for the Vice City glare on arrival."),
  buildFlight(10, 'CE010', 4, 'LAX', 'JFK', 1 * DAY, 330, 210, 'on-time', "Coast-to-coast, several times a day. The getaway route, if you catch our drift."),
  buildFlight(11, 'SL111', 0, 'JFK', 'LAX', 1.5 * DAY, 340, 220, 'on-time', "Coast-to-coast with premium economy. Upgrade your seat, not your alibi."),
  buildFlight(12, 'PA212', 1, 'SYD', 'SIN', 8 * DAY, 480, 470, 'on-time', "Overnight run with lie-flat business seats, so you land looking like you didn't just pull off the trip of a lifetime."),
];

function passwordHash(plain) {
  return bcrypt.hashSync(plain, 10);
}

const users = [
  {
    id: 1,
    role: 'admin',
    name: 'Alex Admin',
    email: 'admin@flightdemo.com',
    passwordHash: passwordHash('Admin@123'),
    createdAt: iso(-60 * DAY),
  },
  {
    id: 2,
    role: 'passenger',
    name: 'Lucia Caminos',
    email: 'lucia.caminos@example.com',
    passwordHash: passwordHash('Passenger@123'),
    passportNumber: 'P1234567',
    createdAt: iso(-45 * DAY),
  },
  {
    id: 3,
    role: 'passenger',
    name: 'Jason Duval',
    email: 'jason.duval@example.com',
    passwordHash: passwordHash('Passenger@123'),
    passportNumber: 'P7654321',
    createdAt: iso(-40 * DAY),
  },
  {
    id: 4,
    role: 'passenger',
    name: 'Cal Hampton',
    email: 'cal.hampton@example.com',
    passwordHash: passwordHash('Passenger@123'),
    passportNumber: 'P1122334',
    createdAt: iso(-20 * DAY),
  },
];

function seatLabel(index) {
  const row = Math.floor(index / 4) + 1;
  const col = ['A', 'B', 'C', 'D'][index % 4];
  return `${row}${col}`;
}

function seatIndexFromLabel(label) {
  const row = Number(label.slice(0, -1));
  const col = 'ABCD'.indexOf(label.slice(-1));
  return (row - 1) * 4 + col;
}

// Deterministic PRNG (not for security use - just so `npm run seed` /
// POST /api/test/reset produce the same "busy" demo data every time,
// which test suites can rely on).
function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260911);

function shuffledSeatIndices(count) {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const passengerUsers = users.filter((u) => u.role === 'passenger');
const specialRequestSamples = [
  '',
  '',
  '',
  'Window seat if possible.',
  'Aisle seat please.',
  'Traveling with an infant, bassinet seat if available.',
  'Vegetarian meal requested.',
  'Extra legroom preferred.',
  'Celebrating an anniversary, a window seat would be lovely.',
  'Wheelchair assistance needed at the gate.',
  'Please seat together with the rest of my family.',
  'Quiet seat away from the galley if possible.',
];
const cardDigits = () => String(Math.floor(1000 + rand() * 9000));

// Two "anchor" bookings kept from earlier demo data (used in README/
// screenshots and in the admin dashboard's stored-XSS example, see
// REQUIREMENTS.md item B3), then a larger, randomized batch spread across
// every flight so the app doesn't look empty (varied seat availability,
// a non-trivial dashboard/revenue total, etc).
const bookings = [
  {
    // A 2-seat group booking, so the multi-seat booking feature has a
    // ready-made example out of the box.
    id: 1,
    bookingReference: 'BKG-000001',
    userId: 2,
    flightId: 1,
    seats: [seatLabel(3), seatLabel(2)],
    passengerName: 'Lucia Caminos',
    specialRequests: 'Window seat if possible, travelling with a small carry-on only.',
    status: 'confirmed',
    payment: {
      cardLast4: '4242',
      amount: 480 * 2,
      currency: 'USD',
      paidAt: iso(-1 * DAY),
      receiptId: 'RCPT-000001',
    },
    createdAt: iso(-1 * DAY),
    cancelledAt: null,
  },
  {
    id: 2,
    bookingReference: 'BKG-000002',
    userId: 3,
    flightId: 8,
    seats: [seatLabel(7)],
    passengerName: 'Jason Duval',
    specialRequests: '',
    status: 'cancelled',
    payment: {
      cardLast4: '1881',
      amount: 540,
      currency: 'USD',
      paidAt: iso(-3 * DAY),
      receiptId: 'RCPT-000002',
    },
    createdAt: iso(-3 * DAY),
    cancelledAt: iso(-2 * DAY),
  },
];

// Weighted group size for a random booking: mostly solo travelers, with
// some pairs and the occasional small family/group of 3-4.
function randomGroupSize(remaining) {
  const roll = rand();
  let size = 1;
  if (roll > 0.9 && remaining >= 4) size = 4;
  else if (roll > 0.75 && remaining >= 3) size = 3;
  else if (roll > 0.5 && remaining >= 2) size = 2;
  return Math.min(size, remaining);
}

let nextBookingId = bookings.length + 1;
for (const flight of flights) {
  // Seats already used by the anchor bookings above, so the random batch
  // never double-books a seat on the same flight.
  const takenIndices = new Set(bookings.filter((b) => b.flightId === flight.id).flatMap((b) => b.seats.map(seatIndexFromLabel)));
  const seatOrder = shuffledSeatIndices(flight.capacity).filter((i) => !takenIndices.has(i));
  const seatBudget = Math.min(seatOrder.length, 3 + Math.floor(rand() * 12)); // 3-14 seats per flight

  let used = 0;
  while (used < seatBudget) {
    const groupSize = randomGroupSize(seatBudget - used);
    const groupSeats = seatOrder.slice(used, used + groupSize).map(seatLabel);
    used += groupSize;

    const passenger = passengerUsers[Math.floor(rand() * passengerUsers.length)];
    const isCancelled = rand() < 0.15;
    const createdOffset = -Math.floor(rand() * 20) * DAY - Math.floor(rand() * DAY);
    const id = nextBookingId;
    nextBookingId += 1;

    bookings.push({
      id,
      bookingReference: `BKG-${String(id).padStart(6, '0')}`,
      userId: passenger.id,
      flightId: flight.id,
      seats: groupSeats,
      passengerName: passenger.name,
      specialRequests: specialRequestSamples[Math.floor(rand() * specialRequestSamples.length)],
      status: isCancelled ? 'cancelled' : 'confirmed',
      payment: {
        cardLast4: cardDigits(),
        amount: flight.price * groupSeats.length,
        currency: flight.currency,
        paidAt: iso(createdOffset),
        receiptId: `RCPT-${String(id).padStart(6, '0')}`,
      },
      createdAt: iso(createdOffset),
      cancelledAt: isCancelled ? iso(createdOffset + Math.floor(rand() * DAY) + DAY) : null,
    });
  }
}

function writeJson(dir, file, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2), 'utf-8');
}

function seed() {
  const collections = { 'airports.json': airports, 'flights.json': flights, 'users.json': users, 'bookings.json': bookings };
  for (const [file, data] of Object.entries(collections)) {
    writeJson(DATA_DIR, file, data);
  }
  // eslint-disable-next-line no-console
  console.log('Seed data written to', DATA_DIR);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
