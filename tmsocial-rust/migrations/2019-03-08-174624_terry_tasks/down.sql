ALTER TABLE tasks
DROP COLUMN format;

DROP TYPE task_format;
ALTER TABLE tasks
ALTER COLUMN memory_limit TYPE FLOAT;