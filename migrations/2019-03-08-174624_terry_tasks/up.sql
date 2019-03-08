CREATE TYPE task_format AS ENUM (
  'ioi',
  'terry');

ALTER TABLE tasks
ADD COLUMN format task_format NOT NULL DEFAULT 'ioi';
ALTER TABLE tasks
ALTER COLUMN memory_limit TYPE INTEGER;