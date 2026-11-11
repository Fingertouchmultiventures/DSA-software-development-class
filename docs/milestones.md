# Milestones: Nine Builds

Each Build is one weekly session and ends with something you can run and show.
A Build starts from the working state of the one before it.

| Build | Week | Milestone | Stories |
|---|---:|---|---|
| [1](build-1.md) | 4 | Domain core in the terminal | Groundwork |
| [2](build-2.md) | 5 | Event search, sorting, backlog, first tests | S02, S03, S04, S05, S06, S16 |
| [3](build-3.md) | 6 | Architecture, state machine, server skeleton | Groundwork |
| 4 | 7 | Working REST API (in memory) | S02, S03, S04, S05, S06, S07 |
| 5 | 8 | SQLite and the overselling fix | S08 |
| 6 | 9 | Frontend on mock data | S05, S06, S07 |
| 7 | 10 | Login, roles, and a connected app | S01, S13, S02, S03, S04 |
| 8 | 11 | Refunds, waitlist, expiry, and real tests | S04 (paid-ticket refunds), S09, S10, S11, S12 |
| 9 | 12 | QR check-in, CI, security, and demo | S14, S15, S16 |

Builds 1 through 3 have implementation guides in this project's `docs`
directory. Guides for later Builds will be added as those milestones are
started.

## Glossary

| Term | Meaning |
|---|---|
| Build | One weekly course session with a demonstrable deliverable. |
| Milestone | The main outcome expected from a Build. |
| Sprint | A short, fixed period of work; each Build is one sprint. |
| Backlog | The user stories and acceptance criteria in [user-stories.md](user-stories.md). |
| User story | A short statement of who needs a feature and why. |
| Acceptance criterion | A Given/When/Then condition that defines when a story passes. |
| Test | Code that checks expected behavior and fails when it is not met. |
| Definition of done | The checklist every story must pass before it is complete. |
| Pull request | A proposed change to review before merging it into `main`. |
| AI log | [ai-log.md](ai-log.md), recording prompts, results, and corrections. |
| Stable sort | A sort that preserves the input order of items with equal keys. |
| Pure function | A function whose result depends only on its input and has no side effects. |
| State machine | A model that defines the states and transitions allowed for an object. |
| Idempotent | An operation that has the same effect when repeated. |
