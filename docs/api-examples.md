# API examples: Builds 1–9

This guide follows the course milestones in `docs/milestones.md`. In this
project copy, Build 3 provides `GET /health` and the Build 4 event/booking
routes are implemented. Build 7–9 operations are a proposed contract for
future milestones, not live endpoints yet.

- OpenAPI contract: [openapi.json](./openapi.json)
- Hoppscotch collection and local environment: [docs/hoppscotch/](./hoppscotch/)

## Import into Hoppscotch

Open [Hoppscotch](https://hoppscotch.io), import
`docs/hoppscotch/build-1-9.collection.json` from Collections, then import
`docs/hoppscotch/local.environment.json` from Environments and select it.
Run the health check first, then the Build 4 requests in order. The collection
also includes proposed Build 7–9 requests; those will return `404` until those
milestones are implemented.

## What each build adds

| Build | API surface |
|---|---|
| 1 | No HTTP API; run the domain demo in the terminal. |
| 2 | No HTTP API; adds domain search, filtering, sorting, and tests. |
| 3 | `GET /health`; HTTP server skeleton and static files. |
| 4 | Implemented here: event, tier, booking, mock payment, and cancellation endpoints. |
| 5 | No new routes; the same API moves to SQLite and booking is made atomic. |
| 6 | No new routes; frontend milestone uses mock data. |
| 7 | Signup/login, bearer authentication, roles, and private booking lists. |
| 8 | Refund preview, paid cancellation, waitlist, offers, and expiry behavior. |
| 9 | Ticket QR tokens, staff check-in, and API security controls. |

Build 4's endpoints below are implemented in this project copy and covered by
API tests. Builds 7–9 entries are **proposed** until those milestones are
implemented and tested. In particular, Builds 7–9 add routes inferred from
their user stories where the build brief does not prescribe an exact path or
payload. Treat those as the proposed contract and adjust them if your
instructor specifies another design.

## Start the server

From the project directory:

```powershell
npm start
```

In another terminal, Build 3's health endpoint can be checked with:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

Expected response:

```json
{"status":"ok"}
```

### If the browser says `API route not found`

The search example below is a real `GET` request. With the current server it
returns `200` and a JSON object such as `{"events":[]}` (or matching events if
the database contains them). If it instead returns
`{"error":{"code":"NOT_FOUND","message":"API route not found"}}`, port 3000 is
probably being served by an older process or a server started from another
project copy:

1. Stop the old server in the terminal where it is running with `Ctrl+C`.
2. In this project root (the folder containing this `package.json`), run
   `npm start`.
3. Retry the `GET` URL.

The API examples are endpoints, not website pages. Opening a `GET` URL in the
browser is useful for a quick check, but requests with JSON bodies or headers
should be sent with PowerShell `Invoke-RestMethod`, `curl`, or Hoppscotch.

## Build 1–3: terminal and health check

Builds 1–2 are domain exercises and have no HTTP API. Run the existing
terminal demo with `npm run demo`. Build 3 adds the health route and
static-file server; event and booking endpoints arrive in Build 4.

## Build 4: event and booking API (implemented)

Start the server with `npm start`. For these examples, `org-1` and `ada` are
sample caller IDs, not real accounts. Replace the sample event details and
date with your own values.
Prices are integer cents/kobo (for example, `500000` represents 5,000.00).
Build 4 identifies callers with `x-user-id`; Build 7 replaces this with login
and bearer tokens.

### 1. Create an event

```bash
curl -i -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-user-id: org-1" \
  -d '{"title":"Lagos Tech Night","city":"Lagos","venue":"Your venue","startsAt":"2026-12-05T17:00:00Z"}'
```

Expected: `201 Created` with a draft event. Save its generated `id` as
`EVENT_ID`.

### 2. Add a ticket tier

```bash
curl -i -X POST "http://localhost:3000/api/events/$EVENT_ID/tiers" \
  -H "Content-Type: application/json" \
  -H "x-user-id: org-1" \
  -d '{"name":"General","priceCents":500000,"capacity":100,"guestsPerUnit":1}'
```

Expected: `201 Created`. Save the tier's `id` as `TIER_ID`. `guestsPerUnit`
may be omitted for a regular one-person ticket.

### 3. Publish and unpublish

```bash
curl -i -X POST "http://localhost:3000/api/events/$EVENT_ID/publish" \
  -H "x-user-id: org-1"
```

Expected: `200 OK` with status `published`. Publishing without a tier fails
with `409 INVALID_STATE`.

To unpublish:

```bash
curl -i -X POST "http://localhost:3000/api/events/$EVENT_ID/unpublish" \
  -H "x-user-id: org-1"
```

### 4. Search and view events

```bash
curl -i "http://localhost:3000/api/events?city=lagos&maxPriceCents=600000&sort=price"
curl -i "http://localhost:3000/api/events/$EVENT_ID"
```

Search parameters include `q`, `city`, `from`, `to`, `maxPriceCents`,
`onlyAvailable`, and `sort` (`date`, `price`, or `availability`). Public
search results include published events only.

### 5. Book tickets

```bash
curl -i -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "x-user-id: ada" \
  -d "{\"tierId\":\"$TIER_ID\",\"quantity\":2}"
```

Expected: `201 Created` with a pending booking. Save its `reference` as
`REFERENCE`.

### 6. View a booking

```bash
curl -i "http://localhost:3000/api/bookings/$REFERENCE" \
  -H "x-user-id: ada"
```

### 7. Pay using the mock gateway

The mock gateway receives a token, never card details. `tok_declined` declines
without changing the pending booking; `tok_success` marks it paid.

```bash
curl -i -X POST "http://localhost:3000/api/bookings/$REFERENCE/pay" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ada" \
  -d '{"paymentToken":"tok_success"}'
```

Expected: `200 OK` with status `paid`. A declined token returns
`402 PAYMENT_DECLINED`; paying again returns `409 INVALID_TRANSITION` and
must not charge again.

### 8. Cancel an unpaid booking

Create another booking, then cancel its reference:

```bash
curl -i -X POST "http://localhost:3000/api/bookings/$REFERENCE/cancel" \
  -H "x-user-id: ada"
```

Expected: `200 OK` with status `cancelled`; the reserved units are released.
Build 4 does not refund paid bookings.

## Build 5–6: no new HTTP routes

Build 5 changes the repository from in-memory storage to SQLite and fixes
overselling with an atomic seat reservation. The event and booking paths above
stay the same; concurrent booking attempts for the last seat should produce
one success and `SOLD_OUT` for the rest.

Build 6 adds a frontend using mock data and does not add API endpoints. Do not
assume its screens are connected to the live API yet.

## Build 7: accounts and bearer authentication (planned)

Signup and login use JSON. The examples below show an organizer account; use
`attendee` or `staff` as appropriate for other users. Passwords must be at
least eight characters. The API must store only a password hash.

```bash
curl -i -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@example.test","password":"correct-horse-42","role":"organizer"}'

curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@example.test","password":"correct-horse-42"}'
```

Copy the returned token to `ACCESS_TOKEN`. Use it for protected calls:

```bash
curl -i http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -i http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The second request returns only the authenticated attendee's bookings.
Protected event/booking calls use bearer authentication from Build 7 onward;
do not send `x-user-id` instead. A bad or expired token returns
`401 UNAUTHENTICATED`. Wrong credentials return `401 INVALID_CREDENTIALS`;
repeated signup email returns `409 EMAIL_TAKEN`.

## Build 8: refunds, waitlists, and expiry (planned)

The following paths are proposed because Build 8 defines the behaviors but
does not specify all route names and payloads.

Preview the refund before cancelling a paid booking:

```bash
curl -i "http://localhost:3000/api/bookings/$REFERENCE/refund-quote" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"
```

Cancel a paid booking and apply the refund policy:

```bash
curl -i -X POST "http://localhost:3000/api/bookings/$REFERENCE/cancel" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"
```

Join the waitlist for a sold-out tier:

```bash
curl -i -X POST http://localhost:3000/api/waitlist \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tierId\":\"$TIER_ID\",\"quantity\":1}"
```

List your offers, then accept the offer before it expires:

```bash
curl -i http://localhost:3000/api/waitlist/offers \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"

curl -i -X POST "http://localhost:3000/api/waitlist/offers/$OFFER_ID/accept" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"
```

A tier with available seats returns `409 NOT_SOLD_OUT`; a repeated waitlist
entry returns `409 ALREADY_ON_WAITLIST`; an expired offer returns
`409 OFFER_EXPIRED`. Pending-booking expiry is a server maintenance job, not a
public API request.

## Build 9: ticket QR and staff check-in (planned)

A paid booking's ticket endpoint returns the signed QR payload. The exact
representation is a proposed contract; the token must contain no personal
data.

```bash
curl -i "http://localhost:3000/api/bookings/$REFERENCE/ticket" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"
```

Staff submit the scanned payload and the event they are checking into:

```bash
curl -i -X POST http://localhost:3000/api/checkin \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"ticketToken\":\"$TICKET_TOKEN\"}"
```

Only staff may check tickets in. Invalid/forged tokens, tickets for another
event, cancelled/refunded bookings, and duplicate scans are rejected. The
first successful scan records the check-in time; simultaneous scans must allow
exactly one success. Rate limits and security headers are server behavior,
not separate API calls.

## Windows PowerShell when curl is unavailable

Windows PowerShell users can make the same event request with its built-in
HTTP cmdlet. Replace the sample values with your own:

```powershell
$body = @{
  title    = "Lagos Tech Night"
  city     = "Lagos"
  venue    = "Your venue"
  startsAt = "2026-12-05T17:00:00Z"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/events" `
  -Method Post `
  -Headers @{ "x-user-id" = "org-1" } `
  -ContentType "application/json" `
  -Body $body
```

## Consistent error response

All API errors use this shape:

```json
{
  "error": {
    "code": "SOLD_OUT",
    "message": "No ticket units are available"
  }
}
```

Common statuses: `400` invalid input/JSON, `401` missing or invalid
authentication, `403` insufficient role, `404` missing resource, `409` state
or capacity conflict, and `500` unexpected server error. Never return stack
traces, passwords, card numbers, or QR personal data.
