const bookings = new Map();

export default bookings;

export function addBooking(id, owner, seat, price) {
  bookings.set(id, { owner, seat, price });
}

bookings.set('G5SL75', {
  owner: 'John Doe',
  seat: 2,
  price: 50.00
});
