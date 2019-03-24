CREATE TYPE submission_status AS ENUM (
  'waiting',
  'compilation_error',
  'success',
  'internal_error');

ALTER TABLE submissions
ADD COLUMN status submission_status NOT NULL DEFAULT 'waiting';

ALTER TABLE submissions
ADD COLUMN compilation_messages TEXT;

ALTER TABLE submissions
ADD COLUMN score FLOAT CHECK(score >= 0);

CREATE TABLE subtask_results (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  num INTEGER NOT NULL CHECK(num >= 0),
  score FLOAT NOT NULL CHECK(score >= 0));

CREATE TABLE testcase_results (
  id SERIAL PRIMARY KEY,
  subtask_result_id INTEGER NOT NULL REFERENCES subtask_results(id) ON DELETE CASCADE,
  running_time FLOAT NOT NULL CHECK(running_time >= 0),
  memory_usage FLOAT NOT NULL CHECK(memory_usage >= 0),
  message TEXT NOT NULL,
  score FLOAT NOT NULL CHECK(score >= 0));

