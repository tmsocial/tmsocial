#![allow(proc_macro_derive_resolution_fallback)]

use crate::schema::{
    submissions, subtask_results, subtasks, tasks, testcase_results,
};
use serde_derive::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, DbEnum, Debug, PartialEq)]
#[PgType = "task_format"]
#[DieselType = "Task_format"]
pub enum TaskFormat {
    IOI,
    Terry,
}

#[derive(Queryable, Identifiable, Debug)]
pub struct Task {
    pub id: i32,
    pub name: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i32,
    pub max_score: f64,
    pub format: TaskFormat,
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

#[derive(Queryable, Identifiable, Associations, Debug)]
#[belongs_to(Task)]
pub struct Submission {
    pub id: i32,
    pub task_id: i32,
    pub files: Vec<String>,
    pub status: SubmissionStatus,
    pub compilation_messages: Option<String>,
    pub score: Option<f64>,
}

#[derive(Queryable, Identifiable, Associations, Debug)]
#[belongs_to(Task)]
pub struct Subtask {
    pub id: i32,
    pub task_id: i32,
    pub num: i32,
    pub max_score: f64,
}

#[derive(Queryable, Identifiable, Associations, Debug)]
#[belongs_to(Submission)]
#[belongs_to(Subtask)]
pub struct SubtaskResult {
    pub id: i32,
    pub submission_id: i32,
    pub score: f64,
    pub subtask_id: i32,
}

#[derive(Queryable, Identifiable, Associations, Debug)]
#[belongs_to(SubtaskResult)]
pub struct TestcaseResult {
    pub id: i32,
    pub subtask_result_id: i32,
    pub running_time: f64,
    pub memory_usage: i32,
    pub message: String,
    pub score: f64,
    pub num: i32,
}
