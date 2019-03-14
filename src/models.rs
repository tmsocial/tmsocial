#![allow(proc_macro_derive_resolution_fallback)]

use serde_derive::{Deserialize, Serialize};

use crate::schema::{
    contests, participations, sites, submissions, subtask_results, subtasks,
    tasks, testcase_results, users,
};
use crate::task_maker_ui::ioi::IOISolutionTestCaseResult;

#[derive(Queryable, Identifiable, Debug)]
pub struct Site {
    pub id: i32,
    pub domain: String,
}

#[derive(Insertable, Debug)]
#[table_name = "sites"]
pub struct NewSite {
    pub domain: String,
}

#[derive(
    Queryable, Identifiable, Associations, Debug, Serialize, Deserialize,
)]
#[belongs_to(Site)]
pub struct Contest {
    pub id: i32,
    pub site_id: i32,
    pub name: String,
}

#[derive(Insertable, Debug)]
#[table_name = "contests"]
pub struct NewContest {
    pub site_id: i32,
    pub name: String,
}

#[derive(Queryable, Identifiable, Associations, Debug, Serialize)]
#[belongs_to(Site)]
pub struct User {
    pub id: i32,
    pub site_id: i32,
    pub username: String,
    #[serde(skip)]
    pub login_token: Option<String>,
}

#[derive(Insertable, Debug)]
#[table_name = "users"]
pub struct NewUser {
    pub site_id: i32,
    pub username: String,
}

#[derive(Queryable, Identifiable, Associations, Debug)]
#[belongs_to(Contest)]
#[belongs_to(User)]
pub struct Participation {
    pub id: i32,
    pub contest_id: i32,
    pub user_id: i32,
}

#[derive(Insertable, Debug)]
#[table_name = "participations"]
pub struct NewParticipation {
    pub contest_id: i32,
    pub user_id: i32,
}

#[derive(Deserialize, Serialize, DbEnum, Debug, PartialEq)]
#[PgType = "task_format"]
#[DieselType = "Task_format"]
pub enum TaskFormat {
    IOI,
    Terry,
}

#[derive(
    Queryable, Identifiable, Associations, Debug, Serialize, Deserialize,
)]
#[belongs_to(Contest)]
pub struct Task {
    pub id: i32,
    pub name: String,
    pub title: String,
    pub time_limit: f64,
    pub memory_limit: i32,
    pub max_score: f64,
    pub format: TaskFormat,
    pub contest_id: i32,
}

#[derive(Insertable, Debug)]
#[table_name = "tasks"]
pub struct NewTask<'a> {
    pub name: &'a str,
    pub title: &'a str,
    pub time_limit: f64,
    pub memory_limit: i32,
    pub max_score: f64,
    pub format: TaskFormat,
    pub contest_id: i32,
}

#[derive(DbEnum, Debug, PartialEq, Serialize)]
#[PgType = "submission_status"]
#[DieselType = "Submission_status"]
pub enum SubmissionStatus {
    Waiting,
    CompilationError,
    Success,
    InternalError,
}

#[derive(Queryable, Identifiable, Associations, Debug, Serialize)]
#[belongs_to(Task)]
pub struct Submission {
    pub id: i32,
    pub task_id: i32,
    pub files: Vec<String>,
    pub status: SubmissionStatus,
    pub compilation_messages: Option<String>,
    pub score: Option<f64>,
    pub participation_id: i32,
}

#[derive(Insertable, Associations)]
#[belongs_to(Task)]
#[table_name = "submissions"]
pub struct NewSubmission {
    pub files: Vec<String>,
    pub task_id: i32,
    pub participation_id: i32,
}

#[derive(Queryable, Identifiable, Associations, Debug)]
#[belongs_to(Task)]
pub struct Subtask {
    pub id: i32,
    pub task_id: i32,
    pub num: i32,
    pub max_score: f64,
}

#[derive(Insertable, Debug)]
#[table_name = "subtasks"]
pub struct NewSubtask {
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

#[derive(Insertable, Debug)]
#[table_name = "subtask_results"]
pub struct NewSubtaskResult {
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

#[derive(Insertable, Debug)]
#[table_name = "testcase_results"]
pub struct NewTestcaseResult<'a> {
    pub subtask_result_id: i32,
    pub running_time: f64,
    pub memory_usage: i32,
    pub message: &'a str,
    pub score: f64,
    pub num: i32,
}

impl<'a> NewTestcaseResult<'a> {
    /// Build a NewTestcaseResult from the result of a IOI solution. The running
    /// time is the sum of user and sys time.
    pub fn from_ioi_testcase_result(
        subtask_result_id: i32,
        tc_num: i32,
        testcase: &IOISolutionTestCaseResult,
    ) -> NewTestcaseResult {
        let resources = &testcase.result[0]
            .as_ref()
            .expect("Constructing NewTestcaseResult with an invalid state")
            .resources;
        let running_time = resources.cpu_time + resources.sys_time;
        NewTestcaseResult {
            subtask_result_id: subtask_result_id,
            running_time: running_time as f64,
            memory_usage: resources.memory as i32,
            message: &testcase.message,
            score: testcase.score as f64,
            num: tc_num,
        }
    }
}
