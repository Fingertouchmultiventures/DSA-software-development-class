import { randomInt } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { newReference } from '../src/domain/ids.js';

const BOOKINGS = 100_000;
const LOOKUPS = 500;
const bookings = [];
const byReference = new Map();

for (let number = 0; number < BOOKINGS; number += 1) {
  const booking = { reference: newReference(), number };
  bookings.push(booking);
  byReference.set(booking.reference, booking);
}

const targets = Array.from(
  { length: LOOKUPS },
  () => bookings[randomInt(BOOKINGS)].reference,
);

function time(label, lookup) {
  const start = performance.now();
  for (const reference of targets) lookup(reference);
  const milliseconds = performance.now() - start;
  console.log(`${label.padEnd(12)} ${milliseconds.toFixed(2).padStart(10)} ms for ${LOOKUPS} lookups`);
  return milliseconds;
}

console.log(`${BOOKINGS.toLocaleString()} bookings in memory\n`);
const arrayMilliseconds = time(
  'Array.find',
  (reference) => bookings.find((booking) => booking.reference === reference),
);
const mapMilliseconds = time('Map.get', (reference) => byReference.get(reference));
console.log(`\nThe Map was about ${Math.round(arrayMilliseconds / Math.max(mapMilliseconds, 0.001)).toLocaleString()}x faster.`);
console.log('Now double BOOKINGS and run it again. Which number grows, and which one stays flat?');
