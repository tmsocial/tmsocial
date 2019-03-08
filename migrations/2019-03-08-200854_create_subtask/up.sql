CREATE TABLE subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  num INTEGER NOT NULL CHECK(num >= 0),
  max_score FLOAT NOT NULL CHECK(max_score >= 0));

CREATE UNIQUE INDEX subtasks_task_num_unique ON subtasks(task_id, num);

ALTER TABLE subtask_results
DROP COLUMN num;

ALTER TABLE subtask_results
ADD COLUMN subtask_id INTEGER NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE;