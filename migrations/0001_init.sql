CREATE TABLE blocks (
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
  expires_at INTEGER
);

CREATE INDEX idx_blocks_status ON blocks(status);
CREATE INDEX idx_blocks_session ON blocks(stripe_session_id);
