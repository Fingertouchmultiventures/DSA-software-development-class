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
