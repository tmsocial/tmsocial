#![allow(proc_macro_derive_resolution_fallback)]
#![allow(unused_imports)]

table! {
    use crate::models::*;
    use diesel::sql_types::*;

    submissions (id) {
        id -> Int4,
        task_id -> Int4,
        files -> Array<Text>,
        status -> Submission_status,
        compilation_messages -> Nullable<Text>,
        score -> Nullable<Float8>,
    }
}

table! {
    use crate::models::*;
    use diesel::sql_types::*;

    subtask_results (id) {
        id -> Int4,
        submission_id -> Int4,
        score -> Float8,
        subtask_id -> Int4,
    }
}

table! {
    use crate::models::*;
    use diesel::sql_types::*;

    subtasks (id) {
        id -> Int4,
        task_id -> Int4,
        num -> Int4,
        max_score -> Float8,
    }
}

table! {
    use crate::models::*;
    use diesel::sql_types::*;

    tasks (id) {
        id -> Int4,
        name -> Varchar,
        title -> Varchar,
        time_limit -> Float8,
        memory_limit -> Int4,
        max_score -> Float8,
        format -> Task_format,
    }
}

table! {
    use crate::models::*;
    use diesel::sql_types::*;

    testcase_results (id) {
        id -> Int4,
        subtask_result_id -> Int4,
        running_time -> Float8,
        memory_usage -> Int4,
        message -> Text,
        score -> Float8,
        num -> Nullable<Int4>,
    }
}

joinable!(submissions -> tasks (task_id));
joinable!(subtask_results -> submissions (submission_id));
joinable!(subtask_results -> subtasks (subtask_id));
joinable!(subtasks -> tasks (task_id));
joinable!(testcase_results -> subtask_results (subtask_result_id));

allow_tables_to_appear_in_same_query!(
    submissions,
    subtask_results,
    subtasks,
    tasks,
    testcase_results,
);
