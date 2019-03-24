CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  files TEXT ARRAY NOT NULL CHECK(array_length(files, 1) > 0))
