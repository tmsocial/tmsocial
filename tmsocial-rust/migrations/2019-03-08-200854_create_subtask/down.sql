ALTER TABLE subtask_results
ADD COLUMN num INTEGER NOT NULL CHECK(num >= 0);

ALTER TABLE subtask_results
DROP COLUMN subtask_id;

DROP INDEX subtasks_task_num_unique;
DROP TABLE subtasks;