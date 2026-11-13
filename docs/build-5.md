# Build 5: SQLite and the overselling fix

*Week 8 of the course. Starts from the finished state of Build 4.*

**You deliver:** persistent SQLite storage and a tested fix for the last-ticket
race.

**Done when**
- `npm run oversell` shows 50 requests for one seat accepted by the unsafe
  read/check/write example, then exactly one accepted by the fixed API.
- `npm test` proves that only one of 50 simultaneous booking requests can
  reserve the last seat, and the test fails if atomic reservation is removed.
- The production server's events, tiers, and bookings survive a server restart.
- The database enforces primary-key, foreign-key, unique, and check constraints,
  including `CHECK (sold >= 0 AND sold <= capacity)`.

## What changed

- `src/db/schema.sql` defines users, events, ticket tiers, and bookings.
- `src/db/connection.js` opens the built-in `node:sqlite` database and applies
  the schema.
- `src/repositories/sqlite.js` implements the same async interface as
  `src/repositories/memory.js`. The services remain unchanged.
- The server writes to `data/ticketing.db` by default. Set `DATABASE_PATH` to
  choose a different database file.
- `npm run seed` inserts sample events once and leaves existing event data
  untouched.
- `npm run oversell` demonstrates stale read/check/write booking versus the
  atomic database reservation.

## The overselling fix

The repository reserves inventory with one conditional update:

```sql
UPDATE ticket_tiers
SET sold = sold + ?
WHERE id = ? AND sold + ? <= capacity
```

The repository checks the statement's changed-row count. One changed row means
the reservation succeeded; zero means there was not enough inventory and the
request fails with `SOLD_OUT`. The booking insert and seat update share a
database transaction, so an insert failure cannot strand reserved seats.

A JavaScript lock only coordinates requests in that Node.js process, so another
process or server instance can still oversell. Checking availability twice
still leaves a race between the final check and the write; the conditional
update performs the check and reservation atomically.

## Run and verify

Requires Node.js 22.13 or newer. From the project root:

```powershell
npm run seed
npm run oversell
npm test
npm start
```

The seed command is safe to repeat: when events already exist, it leaves the
database unchanged. The oversell demo uses fresh in-memory SQLite databases
and does not modify the server's persistent database.

## AI prompt

Read `README.md`, `docs/user-stories.md`, this guide, and all files in `src/`
before changing the Build 5 implementation. Preserve the existing Build 4
services and HTTP routes.

1. Use `node:sqlite` for tables with primary keys, foreign keys, unique
   constraints, and checks. Enforce `CHECK (sold >= 0 AND sold <= capacity)`.
2. Implement the same repository methods as the memory adapter. Bind every
   query value with `?` placeholders; never assemble SQL from input strings.
3. Make the server persistent across restarts, and add an idempotent
   `npm run seed`.
4. Demonstrate 50 concurrent requests for exactly one remaining seat.
   First show the unsafe stale-read/check/write behavior, then show the fix.
5. Reserve seats with one conditional SQL update and use its changed-row count
   to decide whether the request won. Do not use a JavaScript lock or repeat a
   separate availability check.
6. Add a `node:test` case proving one success and 49 `SOLD_OUT` results. The
   test must fail if the atomic reservation is removed.
7. Run all checks in this guide and record what was wrong or corrected in
   `docs/ai-log.md`.

When done, list every changed file and any rule that was uncertain.

## Definition of done

The Definition of done in [user-stories.md](user-stories.md) applies to every
story in this build.

[All milestones](milestones.md) · [Build 4](build-4.md)
