# Build 1 architecture

## Module relationships

```mermaid
flowchart TD
  index[index.js] --> greetings[greetings.js]
  index --> bookings[object.js]
  index --> counter[class.js]

  demo[scripts/demo.js] --> inventory[src/domain/inventory.js]
  demo --> errors[src/domain/errors.js]
  inventory --> ids[src/domain/ids.js]
  inventory --> errors
  inventory --> queue[src/domain/waitlistQueue.js]

  benchmark[scripts/benchmark-lookup.js] --> ids
```

The entry point is a small JavaScript exercise. The ticket-booking demo and
benchmark are separate scripts that use the domain modules.

## Responsibilities

- **Entry point:** `index.js` composes greeting functions, a sample booking
  map, and a counter instance, then writes their results to the terminal.
- **Domain:** `src/domain/inventory.js` validates inputs and applies event,
  ticket-tier, booking, cancellation, and waitlist rules. `DomainError`
  represents expected invalid operations with a stable error code.
- **Identifiers:** `src/domain/ids.js` uses Node's `node:crypto` module for
  UUIDs and booking references.
- **Waitlist:** `src/domain/waitlistQueue.js` implements a FIFO linked-list
  queue. Enqueue, dequeue, peek, and size access are O(1).
- **Scripts:** `scripts/demo.js` exercises domain behavior; the benchmark
  compares searching an array with looking up a key in a `Map`.

## In-memory data

`createStore()` creates Maps for events, ticket tiers, bookings, bookings by
reference, and per-tier waitlists. A demo run creates a fresh store, so its
data does not persist after the process exits.

`object.js` separately exports a pre-populated Map for the introductory
`index.js` example. It is not the same store created by the domain demo.

There is no HTTP layer, browser interface, or persistent database in this
build.
