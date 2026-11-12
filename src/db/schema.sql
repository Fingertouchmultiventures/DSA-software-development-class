CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  email      TEXT UNIQUE,
  role       TEXT CHECK (role IN ('organizer', 'attendee', 'staff')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  organizer_id  TEXT NOT NULL REFERENCES users (id),
  title         TEXT NOT NULL CHECK (length(trim(title)) > 0),
  city          TEXT NOT NULL CHECK (length(trim(city)) > 0),
  venue         TEXT NOT NULL DEFAULT '',
  starts_at     TEXT NOT NULL,
  hall_capacity INTEGER CHECK (
    hall_capacity IS NULL
    OR (typeof(hall_capacity) = 'integer' AND hall_capacity > 0)
  ),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'))
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(trim(name)) > 0),
  price_cents     INTEGER NOT NULL CHECK (
    typeof(price_cents) = 'integer' AND price_cents >= 0
  ),
  capacity        INTEGER NOT NULL CHECK (
    typeof(capacity) = 'integer' AND capacity >= 1
  ),
  sold            INTEGER NOT NULL DEFAULT 0 CHECK (
    typeof(sold) = 'integer' AND sold >= 0 AND sold <= capacity
  ),
  guests_per_unit INTEGER NOT NULL DEFAULT 1 CHECK (
    typeof(guests_per_unit) = 'integer' AND guests_per_unit >= 1
  ),
  UNIQUE (id, event_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id           TEXT PRIMARY KEY,
  reference    TEXT NOT NULL UNIQUE,
  user_id      TEXT NOT NULL REFERENCES users (id),
  event_id     TEXT NOT NULL REFERENCES events (id),
  tier_id      TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (
    typeof(quantity) = 'integer' AND quantity BETWEEN 1 AND 10
  ),
  amount_cents INTEGER NOT NULL CHECK (
    typeof(amount_cents) = 'integer' AND amount_cents >= 0
  ),
  status       TEXT NOT NULL CHECK (
    status IN ('pending', 'paid', 'cancelled', 'refunded', 'checked_in')
  ),
  created_at   TEXT NOT NULL,
  FOREIGN KEY (tier_id, event_id) REFERENCES ticket_tiers (id, event_id)
);

CREATE INDEX IF NOT EXISTS ticket_tiers_event_id ON ticket_tiers (event_id);
CREATE INDEX IF NOT EXISTS bookings_tier_id ON bookings (tier_id);
CREATE INDEX IF NOT EXISTS bookings_user_id ON bookings (user_id);
