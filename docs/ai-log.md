# AI log

The following entries record the significant prompts used to complete and
verify Build 1.

## Build 1

### Prompt 1: Fix the Node.js module loading error

- **What I asked:** Fix the startup error while running the project with Node.js.
- **What came back:** Set the package to ES-module mode and changed the
  greeting import to use the named export provided by `greetings.js`.
- **What was wrong (or "nothing"):** The package was configured as CommonJS
  while the project used ES-module syntax. The entry point also requested a
  default greeting export, but `greetings.js` exports `greet` by name.

### Prompt 2: Fix the booking-map import and entry-point error

- **What I asked:** Fix the error that said `object.js` did not provide a
  default export.
- **What came back:** Exported the bookings Map as the default export and
  corrected the misspelled `consol.log` call to `console.log`.
- **What was wrong (or "nothing"):** The entry point's default import did not
  match the exports in `object.js`; the console typo would also have caused a
  runtime error.

### Prompt 3: Fix the missing counter module

- **What I asked:** Fix the syntax and missing-module errors when the entry
  point tried to import `counter.js`.
- **What came back:** Imported the existing class from `class.js`, created an
  instance with `new Counter()`, and printed its value before and after
  incrementing.
- **What was wrong (or "nothing"):** There was no `counter.js`; the class was
  defined in `class.js`. The entry point needed an instance to read the
  counter value and call `increment()`.

### Verification

After these corrections, `node index.js` and `npm run demo` completed
successfully. `npm run benchmark` also ran and printed timings for `Array.find`
and `Map.get`.

## Build 2

### Prompt 1: Implement Build 2 and prepare it for deployment

- **What I asked:** Add the Build 2 search, stable sorting, publishing,
  user-story acceptance tests, and an npm test command; include General, VIP,
  Red Carpet, and Couple Pass ticket levels.
- **What came back:** Added event summaries and publish/unpublish operations,
  pure search filters, a non-mutating merge sort, Node test coverage, sample
  tier levels in the demo, and Build 2 documentation.
- **What was wrong (or "nothing"):** The first expected date-sort order in a
  test did not account for the earlier event time on the same day. The test
  expectation was corrected to match chronological ordering; the suite then
  passed.

## Build 3

### Prompt 1: Architecture, state machine, and server skeleton
- **What I asked:** Add the Build 3 architecture and booking state machine,
  then create a Node HTTP router/server with `/health`, consistent JSON
  errors, and static-file serving. Preserve the existing Build 2 domain and
  ticket-inventory demo.
- **What came back:** Added the state machine, method/path router, HTTP app,
  port configuration, server entry point, static page, tests, and Build 3
  architecture documentation.
- **What was wrong (or "nothing"):** The first documentation draft treated
  users only as a future model; it was updated to include the requested user
  entity while clarifying that authentication and persistence are not yet
  implemented. The current demo's General waitlist attempts return
  `NOT_SOLD_OUT` because seats remain; that existing behavior was documented
  and left unchanged.

## Build 4

### Prompt 1: Build 4 API and all-build API references

- **What I asked:** Add the Build 4 REST API with an async in-memory
  repository, event and booking services, a mock payment gateway, API routes,
  and real-server tests. Prepare the Build 1–9 API guide, OpenAPI contract,
  and importable Hoppscotch collection/environment.
- **What came back:** Added event/tier/publish/search and booking/pay/cancel
  routes, service/repository/gateway modules, API tests, staged API docs, and
  Hoppscotch imports. Build 7–9 operations are explicitly proposed for their
  later milestones, not claimed as live.
- **What was wrong (or "nothing"):** The first documentation draft called
  Build 4 routes planned; after implementing them, the API guide and OpenAPI
  status were corrected. The mock gateway was tightened to accept only its
  two documented test tokens. Build 5's atomic concurrency protection,
  authentication, refunds, waitlists, and QR check-in remain future work.
- **Rules I was unsure about:** Event detail reads for draft events require
  the organizer's `x-user-id`; Build 4 does not yet have account authentication.
  Build 5 must replace the in-memory booking race rather than adding locks.
- **Verification:** `node --test test/api.test.js test/httpApp.test.js`
  passed. The full `npm test` run passed all 185 tests. OpenAPI and Hoppscotch
  JSON files parsed successfully, and every OpenAPI `$ref` resolved.

## Build 5

### Prompt 1: Persist data in SQLite and fix overselling

- **What I asked:** Replace the production server's in-memory repository with
  SQLite while keeping the Build 4 services unchanged. Add database
  constraints, an idempotent seed command, and a 50-request last-seat demo and
  test using an atomic conditional update.
- **What came back:** Added the SQLite schema, connection, repository, seed and
  oversell scripts, persistent server wiring, restart/constraint/concurrency
  tests, and Build 5 documentation.
- **What was wrong (or "nothing"):** The first integration test attempted to
  listen on a server that `startServer()` had already started; it now waits for
  that listener. The SQLite repository now defaults to a fresh in-memory
  database for isolated tests, while the production server explicitly passes
  its persistent file path.
- **Why not a JavaScript lock or two availability checks:** A process-local
  lock cannot coordinate other server processes or instances. A separate
  availability check still leaves a race before the write, so the conditional
  database update must perform both the check and reservation atomically.
- **Verification:** `npm test` passed all 196 tests. `npm run oversell` showed
  50 accepted booking claims for the one seat before the fix and one success
  plus 49 `SOLD_OUT` results after it. Running `npm run seed` twice against a
  temporary database seeded three events once and left them unchanged on the
  second run. Removing the conditional capacity predicate made
  `test/oversell.test.js` fail as expected; the atomic predicate was restored
  before the final test run.
