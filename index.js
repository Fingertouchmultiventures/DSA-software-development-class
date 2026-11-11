import { greet,farewell } from './greetings.js';
import bookings from './object.js';
import Counter from './class.js';

const name = 'John Doe';

let greetingMessage = greet(name);
let farewellMessage = farewell(name);

console.log(greetingMessage);
console.log(farewellMessage);

console.log('Current bookings:');
for (const [id, booking] of bookings) {
  console.log(`Booking ID: ${id}, Owner: ${booking.owner}, Seat: ${booking.seat}, Price: $${booking.price.toFixed(2)}`);
}

const counter = new Counter();

console.log(counter.value); // Output: 0
counter.increment();
console.log(counter.value); // Output: 1