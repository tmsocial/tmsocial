ALTER TABLE testcase_results
ALTER COLUMN memory_usage TYPE INTEGER;

ALTER TABLE testcase_results
ADD COLUMN num INTEGER CHECK(num >= 0);

CREATE UNIQUE INDEX testcase_results_subtask_result_num_unique ON testcase_results(subtask_result_id, num);
CREATE UNIQUE INDEX subtask_results_submission_subtask_unique ON subtask_results(submission_id, subtask_id);