ALTER TABLE blocks ADD COLUMN message TEXT;
ALTER TABLE blocks ADD COLUMN emoji TEXT;
ALTER TABLE blocks ADD COLUMN slogan TEXT;
ALTER TABLE blocks ADD COLUMN buyer_number INTEGER;

CREATE TABLE counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT INTO counters (name, value) VALUES ('buyer_number', 0);
