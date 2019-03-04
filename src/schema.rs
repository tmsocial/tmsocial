table! {
    submissions (id) {
        id -> Int4,
        task_id -> Int4,
        files -> Array<Text>,
    }
}

table! {
    tasks (id) {
        id -> Int4,
        name -> Varchar,
        title -> Varchar,
        time_limit -> Float8,
        memory_limit -> Float8,
        max_score -> Float8,
    }
}

joinable!(submissions -> tasks (task_id));

allow_tables_to_appear_in_same_query!(
    submissions,
    tasks,
);
