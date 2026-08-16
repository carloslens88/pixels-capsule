-- Splits the shared `blocks` table into two independent tables so /pixels/ and
-- /capsules/ no longer share a coordinate space, counter, or overlap-check graph.
-- Pre-launch: no real purchases exist yet, so this drops the old table outright
-- rather than migrating rows.

DROP TABLE IF EXISTS blocks;

CREATE TABLE pixel_blocks (
  id TEXT PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_email TEXT NOT NULL,
  link_url TEXT NOT NULL,
  image_key TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  price_cents INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  message TEXT,
  emoji TEXT,
  slogan TEXT,
  buyer_number INTEGER
);

CREATE INDEX idx_pixel_blocks_status ON pixel_blocks(status);
CREATE INDEX idx_pixel_blocks_session ON pixel_blocks(stripe_session_id);

CREATE TABLE capsule_blocks (
  id TEXT PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_email TEXT NOT NULL,
  link_url TEXT NOT NULL,
  image_key TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  price_cents INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  message TEXT,
  emoji TEXT,
  slogan TEXT,
  buyer_number INTEGER
);

CREATE INDEX idx_capsule_blocks_status ON capsule_blocks(status);
CREATE INDEX idx_capsule_blocks_session ON capsule_blocks(stripe_session_id);

DELETE FROM counters WHERE name = 'buyer_number';
INSERT INTO counters (name, value) VALUES ('pixel_buyer_number', 0), ('capsule_buyer_number', 0);
