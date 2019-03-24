DROP TABLE testcase_results;
DROP TABLE subtask_results;

ALTER TABLE submissions
DROP COLUMN status;

ALTER TABLE submissions
DROP COLUMN compilation_messages;

ALTER TABLE submissions
DROP COLUMN score;

DROP TYPE submission_status;
