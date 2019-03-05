use crate::schema::{submissions, tasks};

#[derive(Queryable, Identifiable, Debug)]
pub struct Task {
    pub id: i32,
    pub name: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: f64,
    pub max_score: f64,
}

#[derive(DbEnum, Debug, PartialEq)]
#[PgType = "submission_status"]
#[DieselType = "Submission_status"]
pub enum SubmissionStatus {
    Waiting,
    CompilationError,
    Success,
    InternalError,
}

#[derive(Queryable, Identifiable, Associations)]
#[belongs_to(Task)]
pub struct Submission {
    pub id: i32,
    pub task_id: i32,
    pub files: Vec<String>,
    pub status: SubmissionStatus,
    pub compilation_messages: Option<String>,
    pub score: Option<f64>,
}
