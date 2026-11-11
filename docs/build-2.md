# Build 2: Event search, sorting, and first tests

*Week 5 of the course. Starts from the finished state of Build 1.*

## Goal

Extend the in-memory ticketing domain with event publishing, public event
summaries, search filters, and stable sorting. Add automated tests for event
creation, ticket tiers, publishing, event discovery, and booking capacity.

## Deliverables

- Events start as drafts; organizers can publish events with ticket tiers and
  unpublish them again.
- Public event summaries include the cheapest tier price and total available
  attendee places, accounting for couple and table packages. Draft events are
  hidden by default.
- An event can have a hall-capacity limit. Tier allocations cannot exceed it,
  and organizers can reallocate unbooked attendee places between ticket tiers.
- Search filters by title or venue, city, inclusive date range, maximum price,
  and availability.
- A stable merge sort orders events by date, price, or availability without
  changing the input list.
- The project backlog and acceptance criteria are recorded in
  [user-stories.md](user-stories.md).
- `npm test` runs the built-in Node.js test suite without third-party packages.

## User stories in this build

### S02: Create an event

As an organizer, I want to create an event with a title, city, venue, and date
so that people can find it.

- **Given** valid event details, **when** the organizer creates the event,
  **then** it is saved as a draft with a generated ID and is hidden from the
  public list.
- **Given** a missing title or city, or an invalid date, **when** the organizer
  creates the event, **then** the operation fails with `VALIDATION` and saves
  nothing.

### S03: Add ticket tiers

As an organizer, I want to add ticket tiers with a price and capacity so that
I can offer different ways to attend.

- **Given** a draft event, **when** the organizer adds a tier with a whole-cent
  price and positive capacity, **then** it starts with zero sold and the full
  capacity available.
- **Given** a fractional or negative price, or non-positive or non-whole
  capacity, **when** a tier is added, **then** the operation fails with
  `VALIDATION`.
- **Given** an event ID that does not exist, **when** a tier is added,
  **then** the operation fails with `NOT_FOUND`.

### S04: Publish and unpublish an event

As an organizer, I want to publish and unpublish an event so that I control
when it is visible to attendees and can take it off the public list if
something goes wrong.

- **Given** a draft event with at least one tier, **when** it is published,
  **then** its status becomes `published` and it appears in the default public
  event list.
- **Given** a draft event without tiers, **when** it is published, **then** the
  operation fails with `INVALID_STATE` and it remains a draft.
- **Given** a published event, **when** the organizer unpublishes it,
  **then** its status becomes `draft` and it no longer appears in the default
  public event list.
- **Given** a draft event, **when** the organizer tries to unpublish it,
  **then** the operation fails with `INVALID_STATE` and the event remains a
  draft.
- **Given** a published event with pending bookings, **when** it is
  unpublished, **then** the bookings remain pending and valid, and their seats
  remain reserved.
- **Given** an event with paid bookings, **when** the organizer unpublishes it,
  **then** every paid booking is refunded in full, marked refunded, and its
  seats are released exactly once. This organizer-triggered refund is not
  reduced by the attendee cancellation refund policy.

**Build boundary:** Build 2 covers publish/unpublish state and pending bookings.
Payment is added later; the paid-booking refund rule is completed with the
refund work in Build 8. Until then, do not claim that unpublishing performs a
refund.

### S05: Search, filter, and sort events

As an attendee, I want to search, filter, and sort published events so that I
can find one I like.

- **Given** events titled "Lagos Tech Meetup" and "Abuja Jazz Night", **when**
  the attendee searches for "JAZZ", **then** only Abuja Jazz Night is returned.
- **Given** events in Lagos and Abuja, **when** the attendee filters by city
  "lagos", **then** only Lagos events are returned, regardless of case.
- **Given** events with different cheapest-tier prices, **when** the attendee
  sets a maximum price and sorts by price, **then** only events within the
  maximum are returned cheapest first, and events without tiers are excluded
  from the price filter.
- **Given** two events on the same date, **when** the attendee sorts by date,
  **then** title and ID provide deterministic tie-breaking.
- **Given** an event at 5 PM on 5 December, **when** the attendee filters
  through `2026-12-05`, **then** that event is included.
- **Given** an invalid date, a price that is not a whole number, or an unknown
  sort option, **when** the attendee searches, **then** the operation fails
  with `VALIDATION`.
- **Given** any event list, **when** it is filtered or sorted, **then** the
  original list is unchanged.
- **Given** events with equal comparison keys, **when** merge sort orders
  them, **then** their relative input order is preserved.

### S06: Book tickets within capacity

As an attendee, I want to book tickets from an event tier so that I get a
place.

- **Given** a published event with three General units left, **when** the
  attendee books two, **then** a pending booking is created, priced in whole
  cents, and one unit remains.
- **Given** one unit left, **when** the attendee tries to book two, **then**
  the operation fails with `SOLD_OUT` and inventory is unchanged.
- **Given** any tier, **when** the attendee requests zero, a negative,
  fractional, or more than ten units, **then** the operation fails with
  `VALIDATION`.

### S16: Run automated tests

- **Given** the project, **when** `npm test` is run, **then** Node's built-in
  test runner runs the suite and exits unsuccessfully if any test fails.
- **Given** a push to GitHub, **when** the workflow runs in Build 9, **then**
  `npm test` runs automatically and a failing test shows as a failed check.

## Sample ticket levels

The terminal demo includes **General**, **VIP**, **Red Carpet**, **Couple
Pass**, and table packages. The sample prices are illustrative whole-cent
values, not a production price list. A Couple Pass is one sellable package
that admits two people; table capacities count tables, with each table's guest
count contributing to attendee-place totals. The 150-person demo hall assigns
its 45 additional places to General.

If demand changes, move available capacity from an unsold tier. For example,
to move two General attendee places to VIP:

```js
reallocateTierCapacity(store, general.id, vip.id, 2);
```

The amount must be an exact whole-unit fit for both tiers. For example, moving
places to a Couple Pass requires an even number. Reallocation cannot take
capacity already booked, move capacity between different events, or exceed
the hall limit.

## Run and verify

Requires Node.js 22.13 or newer. From the project directory:

```powershell
node index.js
npm run demo
npm test
npm run benchmark
```

The demo injects a fixed clock into its in-memory store so each example
booking can show a chosen timestamp. Some bookings share the same timestamp
to represent people booking at the same time. Normal stores use the current
system time.

### Done when

- Event creation validates its required text and date fields and stores valid
  events as drafts.
- Ticket prices use whole cents and capacities are positive whole numbers.
- Drafts do not appear in the public list; publishing and unpublishing changes
  their visibility.
- Event filters and sorting return new lists and leave their input unchanged.
- Merge sort preserves the relative order of equal items.
- `npm test` passes all Build 2 tests.

## AI prompt

Read `README.md`, `docs/user-stories.md`, this file, and the files in
`src/domain/` and `test/` before making changes. Work in plain JavaScript ES
modules on Node.js 22.13 or newer, with no outside packages. Do not change
behavior that already works.

1. Keep `src/domain/sorting.js` as a hand-written, stable merge sort. It must
  return a new array and must not call `Array.prototype.sort` or mutate input.
2. In `src/domain/inventory.js`, support publishing only draft events that
  have ticket tiers, listing summaries with drafts hidden by default, and
  unpublishing only published events. Unpublishing must hide the event without
  cancelling or releasing seats for pending bookings. Paid-booking refunds
  are a later Build 8 requirement, not a Build 2 behavior.
3. Keep `src/domain/eventSearch.js` pure. Search title and venue case-
  insensitively; filter city case-insensitively and dates inclusively (a
  date-only end date includes the whole day); filter by cheapest whole-cent
  price and availability; sort by date, price, or availability with
  deterministic title and ID tie-breakers. Use the merge sort and reject bad
  dates, prices, and sort options with `VALIDATION`.
4. Add `node:test` and `node:assert/strict` tests for the acceptance criteria
  above, including errors, empty lists, stable ordering, and unchanged input
  arrays.
5. Keep `npm test` running the full built-in Node.js test suite.

When done, list every changed file and any rule you were unsure about. Review
the code and run the checks in this guide; record any AI mistakes and fixes in
`docs/ai-log.md`.

## Implementation map

| Path | Build 2 responsibility |
| --- | --- |
| `src/domain/inventory.js` | Publish/unpublish events and produce public summaries |
| `src/domain/eventSearch.js` | Pure event filters, comparators, and composed search |
| `src/domain/sorting.js` | Stable, non-mutating merge sort |
| `test/build2.test.js` | Event, tier, publishing, search, and booking acceptance tests |
| `test/sorting.test.js` | Merge sort ordering, stability, and non-mutation tests |
| `scripts/demo.js` | Demonstrates ticket levels and published inventory |

Build 2 extends the domain model from [Build 1](build-1.md). See
[user-stories.md](user-stories.md) for the Given/When/Then criteria and
[ai-log.md](ai-log.md) for the implementation record.
