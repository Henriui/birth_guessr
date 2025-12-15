ALTER TABLE events ADD COLUMN secret_key VARCHAR NOT NULL DEFAULT 'legacy-event-key';
