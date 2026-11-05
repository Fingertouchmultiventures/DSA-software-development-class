# Build 2: Event search, sorting, and first tests

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
