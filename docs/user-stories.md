# Build 2 product backlog

These stories describe the Build 2 domain behavior. Prices are stored as whole
cents. The sample ticket levels are General, VIP, Red Carpet, and Couple Pass;
the Couple Pass is a two-person package.

## S02: Create an event

As an organizer, I want to create an event with a title, city, venue, and date
so that people can find it.

- **Given** valid event details, **when** the organizer creates the event,
  **then** it is saved as a draft with a generated ID and is hidden from the
  public list.
- **Given** a missing title or city, or an invalid date, **when** the
  organizer creates the event, **then** the operation fails with
  `VALIDATION` and saves nothing.

## S03: Add ticket levels

As an organizer, I want to add priced ticket levels with a capacity so that I
can offer different ways to attend.

- **Given** a draft event, **when** the organizer adds a General, VIP, Red
  Carpet, or Couple Pass tier with a whole-cent price and positive capacity,
  **then** the tier starts with zero sold and the full capacity available.
- **Given** a fractional/negative price or non-positive/non-whole capacity,
  **when** a tier is added, **then** the operation fails with `VALIDATION`.
- **Given** an event ID that does not exist, **when** a tier is added,
  **then** the operation fails with `NOT_FOUND`.

## S04: Publish and unpublish an event

they are visible to attendees.
As an organizer, I want to publish and unpublish an event so that I control
when it is visible to attendees and can take it off the public list if
something goes wrong.

- **Given** a draft event with at least one tier, **when** it is published,
  **then** its status becomes `published` and it appears in the default public
  event list.
- **Given** a draft event without tiers, **when** it is published, **then** the
  operation fails with `INVALID_STATE` and it remains a draft.
- **Given** a published event, **when** the organizer unpublishes it, **then**
  its status becomes `draft` and it no longer appears in the default public
  event list.
- **Given** a draft event, **when** the organizer tries to unpublish it,
  **then** the operation fails with `INVALID_STATE` and the event remains a
  draft.
- **Given** an unpublished event with pending bookings, **when** it is
  unpublished, **then** those bookings remain valid and their seats remain
  reserved.
- **Given** an event with paid bookings, **when** the organizer unpublishes it,
  **then** every paid booking is refunded in full, marked refunded, and its
  seats are released exactly once. This organizer-triggered refund is not
  reduced by the attendee cancellation refund policy.

**Implementation note:** Build 2 creates pending bookings but does not yet
support payment or refunds. Preserve the paid-booking criterion for the build
that adds those capabilities; do not treat unpublishing as a refund in the
Build 2 domain alone.

## S05: Search, filter, and sort events

As an attendee, I want to search, filter, and sort published events so that I
can find one I like.

- **Given** events titled "Lagos Tech Meetup" and "Abuja Jazz Night", **when**
  I search for "JAZZ", **then** only Abuja Jazz Night is returned.
- **Given** events in Lagos and Abuja, **when** I filter by city "lagos",
  **then** only Lagos events are returned, regardless of case.
- **Given** events with different cheapest-tier prices, **when** I set a
  maximum price and sort by price, **then** matching events are cheapest first;
  events without tiers are excluded from the price filter and sort last.
- **Given** two events on the same date, **when** I sort by date, **then**
  title and ID provide deterministic tie-breaking.
- **Given** an event at 5 PM on 5 December, **when** I filter through
  `2026-12-05`, **then** that event is included.
- **Given** an invalid date, non-whole-cent price, or unknown sort option,
  **when** I search, **then** the operation fails with `VALIDATION`.
- **Given** any event list, **when** it is filtered or sorted, **then** the
  original list is unchanged.
- **Given** events with the same comparison key, **when** merge sort orders
  them, **then** their relative input order is preserved.

## S06: Book tickets within capacity

As an attendee, I want to book tickets from an event tier so that I get a
place.

- **Given** a published event with three General units left, **when** I book
  two, **then** I receive a pending booking charged in whole cents and one
  unit remains.
- **Given** one unit left, **when** I try to book two, **then** the operation
  fails with `SOLD_OUT` and inventory is unchanged.
- **Given** any tier, **when** I request zero, a negative, fractional, or more
  than ten units, **then** the operation fails with `VALIDATION`.

## S16: Run automated tests

As a team, we want `npm test` to run the automated tests so that regressions
are noticed early.

- **Given** the project, **when** `npm test` is run, **then** Node's built-in
  test runner executes the suite and exits unsuccessfully if any test fails.

## S08: Sell the last ticket to only one attendee

As an attendee, I want to be certain the last ticket is sold to only one
person, so that nobody turns up to a full event.

- **Given** exactly one seat left, **when** 50 attendees try to book at the
  same moment, **then** exactly one booking succeeds, 49 receive `SOLD_OUT`,
  and sold seats never exceed capacity.
- **Given** the database reservation fix is removed, **when** the overselling
  test runs, **then** the test fails.
