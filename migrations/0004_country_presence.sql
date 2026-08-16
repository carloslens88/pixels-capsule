ALTER TABLE pixel_blocks ADD COLUMN country TEXT;
ALTER TABLE capsule_blocks ADD COLUMN country TEXT;

CREATE INDEX idx_pixel_blocks_country ON pixel_blocks(country);
CREATE INDEX idx_capsule_blocks_country ON capsule_blocks(country);

-- Lightweight live-viewer presence: each tab heartbeats every ~20s; a row older
-- than the window used in the count query is considered gone. Rows are pruned
-- opportunistically on each heartbeat rather than via a cron job.
CREATE TABLE presence (
  session_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);
