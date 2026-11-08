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
