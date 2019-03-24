DROP INDEX testcase_results_subtask_result_num_unique;
DROP INDEX subtask_results_submission_subtask_unique;

ALTER TABLE testcase_results
ALTER COLUMN memory_usage TYPE FLOAT;

ALTER TABLE testcase_results
DROP COLUMN num;