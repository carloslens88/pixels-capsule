-- Lets a capsule stay visibly in orbit but keep its message/image sealed until
-- `deliver_at`, when a scheduled Worker sweep emails `recipient_email` and the
-- public API stops masking the capsule's content. Added to pixel_blocks too so
-- both tables keep the same shape (see 0003/0004) — pixels never populate these
-- columns, the wall is meant to be immediate, not delayed.

ALTER TABLE pixel_blocks ADD COLUMN deliver_at INTEGER;
ALTER TABLE pixel_blocks ADD COLUMN recipient_email TEXT;
ALTER TABLE pixel_blocks ADD COLUMN delivered_at INTEGER;

ALTER TABLE capsule_blocks ADD COLUMN deliver_at INTEGER;
ALTER TABLE capsule_blocks ADD COLUMN recipient_email TEXT;
ALTER TABLE capsule_blocks ADD COLUMN delivered_at INTEGER;

CREATE INDEX idx_capsule_blocks_deliver_at ON capsule_blocks(deliver_at) WHERE delivered_at IS NULL;
