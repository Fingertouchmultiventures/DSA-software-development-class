# Build 4: Working REST API (in memory)

*Week 7 of the course. Starts from the finished state of Build 3.*

**You deliver:** an API that works end to end with data held in memory: create events and tiers, publish, search, book, pay with a mock payment, and cancel an unpaid booking.

**You practise:** REST design, status codes, validation, `async`/`await`, separating routes from rules.

**Done when**
- Every call in `docs/api-examples.md` works with `curl`.
- Errors always come back in the same shape.
- `npm test` includes API-level tests.

The current project API reference is [api-examples.md](api-examples.md), with
its OpenAPI contract in [openapi.json](openapi.json) and an importable
[Hoppscotch collection](hoppscotch/build-1-9.collection.json).

## User stories in this build

Stories S02 to S06 now have to pass through the API as well, with the criteria from Build 2.

### S02: As an organizer, I want to create an event with title, city, venue and date, so that people can find it

Criteria: see [Build 2](build-2.md). They must now also pass through the API.

### S03: As an organizer, I want to add ticket tiers with a price and capacity, so that I can sell different kinds of ticket

Criteria: see [Build 2](build-2.md). They must now also pass through the API.

### S04: As an organizer, I want to publish and unpublish an event, so that I control when it goes public

Criteria: see [Build 2](build-2.md). They must now also pass through the API.

### S05: As an attendee, I want to search, filter and sort published events, so that I can find one I like

Criteria: see [Build 2](build-2.md). They must now also pass through the API.

### S06: As an attendee, I want to book a number of tickets from a tier, so that I get a place

Criteria: see [Build 2](build-2.md). They must now also pass through the API.

### S07: As an attendee, I want to pay for a booking (mock payment), so that the booking is confirmed

- **Given** a pending booking
  **When** the attendee pays with a valid mock card
  **Then** the booking becomes paid and the reference code is shown.
- **Given** a pending booking
  **When** the mock card is declined
  **Then** the request is rejected with `PAYMENT_DECLINED`, the booking stays pending, and the attendee can try again.
- **Given** a cancelled booking
  **When** someone tries to pay for it
  **Then** the request is rejected with `INVALID_TRANSITION`.
- **Given** a booking that is already paid
  **When** the attendee pays again
  **Then** the request is rejected and the card is charged only once.

## AI prompt

Build 4's in-memory API is already implemented in this project. Use the prompt
below to review or continue the build; do not recreate or overwrite working
features. Its layer directions reflect the current code: the domain owns
ticketing rules, services coordinate domain and repository calls, and routes
translate HTTP requests and responses.

Give your AI tool these files first: `README.md`, `docs/user-stories.md`,
`docs/build-4.md`, `docs/build-2.md`, `docs/build-3.md`,
`docs/architecture.md`, `docs/api-examples.md`, and the files in `src/` and
`test/`.

Then paste the prompt below. When it answers, do not trust it yet: read the code, run the checks in "Done when", and write what was wrong in `docs/ai-log.md`.

```text
We are reviewing and completing Build 4 of the Event Ticketing capstone in
plain JavaScript (ES modules, Node 22.13 or newer, no outside packages).
Read README.md, docs/user-stories.md, docs/build-2.md, docs/build-3.md,
docs/build-4.md, docs/architecture.md, docs/api-examples.md, and the relevant
files in src/ and test/ before editing. Follow the architecture document.

The Build 4 API is already implemented in this project. Inspect it first and
preserve working behavior; make only changes needed to meet this prompt or
repair a demonstrated defect.

1. Keep the existing layers and responsibilities:
   - src/domain/inventory.js and other src/domain/ modules own ticketing
     rules, state transitions, search, sorting, and shared input validation.
   - src/repositories/memory.js exposes async repository operations over the
     domain's in-memory store.
   - src/services/eventService.js and bookingService.js receive the
     repository as an argument. They coordinate domain/repository operations
     and enforce caller ownership; they must not import or construct the
     repository.
   - src/http/routes.js translates HTTP inputs/outputs and contains no
     ticketing rules.
   Do not move domain rules into routes or duplicate them in services.

2. Keep src/lib/mockPaymentGateway.js asynchronous. It must receive a mock
   payment token and whole-cent amount only, never a card number. Support
   tok_success and tok_declined; a decline leaves the booking pending.

3. Keep the Build 4 HTTP API and consistent JSON error shape:
   - POST /api/events
   - GET /api/events (search, filter, and sort with query parameters)
   - GET /api/events/:id (public events are readable; draft events require
     their organizer's x-user-id)
   - POST /api/events/:id/tiers
   - POST /api/events/:id/publish and /api/events/:id/unpublish
   - POST /api/bookings
   - GET /api/bookings/:reference
   - POST /api/bookings/:reference/pay
   - POST /api/bookings/:reference/cancel (pending/unpaid bookings only)
   Until Build 7, protected calls identify the caller with x-user-id. Enforce
   event ownership for organizer changes and booking ownership for read, pay,
   and cancel operations.

4. Preserve Build 1–3 behavior and the inventory examples: General, VIP,
   Red Carpet, Couple Pass, Emerald Table for 4, Sapphire Table for 6, Diamond
   Table for 10, guestsPerUnit, hallCapacity, and the 150-attendee demo.
   Do not add SQLite, authentication, refunds, waitlist offers, expiry, QR
   check-in, or other later-build features here.

5. Keep docs/api-examples.md accurate, with a curl example for every
   implemented Build 4 operation and the correct order for the create, add
   tier, publish, book, and pay flow. Keep docs/openapi.json and the
   Hoppscotch collection in docs/hoppscotch/ aligned if an API path or payload
   changes. Label Build 7–9 requests as proposed, not implemented.

6. Use node:test API tests that send requests to an actual HTTP listener on a
   free port (port 0). Cover the Build 4 request flow, validation and
   consistent error responses, ownership checks, declined payment preserving
   pending status, successful payment, duplicate payment rejection, and
   unpaid cancellation.

Rules: money is whole cents; a booking can only be paid by its owner; never
pass card details to the mock gateway. Do not add locks or transactions in
Build 4: simultaneous booking safety is the Build 5 task, so document that
known limitation rather than implying the in-memory implementation prevents
overselling. When done, list every changed file, the checks run and their
results, and any rule you were unsure about.
```

## Definition of done

The Definition of done in [user-stories.md](user-stories.md) applies to every story in this build.

[All milestones](milestones.md) · [Build 3](build-3.md) · [Build 5](build-5.md)
