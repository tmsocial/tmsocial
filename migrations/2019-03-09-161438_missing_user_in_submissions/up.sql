ALTER TABLE submissions
ADD COLUMN participation_id INTEGER NOT NULL REFERENCES participations(id) ON DELETE CASCADE;