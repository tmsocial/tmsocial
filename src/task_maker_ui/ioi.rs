extern crate serde_json;

use crate::task_maker_ui::hash_map_serializers::*;
use crate::task_maker_ui::*;
use serde_derive::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub enum IOITaskType {
    Batch,
    Communication,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOITestCase {
    generator: Option<String>,
    generator_path: Option<String>,
    args: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISubtask {
    pub name: String,
    pub max_score: f32,
    #[serde(with = "serialize_hash_map")]
    pub cases: HashMap<TestcaseNum, IOITestCase>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOITask {
    pub name: String,
    pub title: String,
    pub time_limit: f32,
    pub memory_limit: u32,
    pub input_file: String,
    pub output_file: String,
    pub task_type: IOITaskType,
    pub official_solution: String,
    pub checker: Option<String>,
    #[serde(with = "serialize_hash_map")]
    pub subtasks: HashMap<SubtaskNum, IOISubtask>,
}

// -------------------- ioi-testcase-outcome -------------------------

#[derive(Serialize, Deserialize, Debug)]
pub enum IOITestCaseStatus {
    #[serde(rename = "WAITING")]
    Waiting,
    #[serde(rename = "SOLVING")]
    Solving,
    #[serde(rename = "SOLVED")]
    Solved,
    #[serde(rename = "CHECKING")]
    Checking,
    #[serde(rename = "ACCEPTED")]
    Accepted,
    #[serde(rename = "WRONG_ANSWER")]
    WrongAnswer,
    #[serde(rename = "PARTIAL")]
    Partial,
    #[serde(rename = "FAILED")]
    Failed,
    #[serde(rename = "SKIPPED")]
    Skipped,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOITestCaseOutcomeData {
    pub name: String,
    pub testcase: TestcaseNum,
    pub subtask: SubtaskNum,
    pub status: IOITestCaseStatus,
    pub score: f32,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOITestCaseOutcome {
    pub state: State,
    pub data: IOITestCaseOutcomeData,
}

// -------------------- ioi-subtask-outcome -------------------------

#[derive(Serialize, Deserialize, Debug)]
pub enum IOISolutionSubtaskResult {
    #[serde(rename = "WAITING")]
    Waiting,
    #[serde(rename = "RUNNING")]
    Running,
    #[serde(rename = "ACCEPTED")]
    Accepted,
    #[serde(rename = "PARTIAL")]
    Partial,
    #[serde(rename = "REJECTED")]
    Rejected,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISubtaskOutcomeData {
    pub name: String,
    pub subtask: SubtaskNum,
    pub status: IOISolutionSubtaskResult,
    pub score: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISubtaskOutcome {
    pub state: State,
    pub data: IOISubtaskOutcomeData,
}

// -------------------- ioi-checking --------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct IOICheckingData {
    pub name: String,
    pub testcase: TestcaseNum,
    pub subtask: SubtaskNum,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIChecking {
    pub state: State,
    pub data: IOICheckingData,
}

// -------------------- ioi-evaluation --------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIEvaluationData {
    pub name: String,
    pub testcase: TestcaseNum,
    pub subtask: SubtaskNum,
    // process and num_processes are set on communication tasks
    #[serde(default)]
    pub process: Option<u32>,
    #[serde(default)]
    pub num_processes: Option<u32>,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIEvaluation {
    pub state: State,
    pub data: IOIEvaluationData,
}

// -------------------- ioi-validation --------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIValidationData {
    pub testcase: TestcaseNum,
    pub subtask: SubtaskNum,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIValidation {
    pub state: State,
    pub data: IOIValidationData,
}

// -------------------- ioi-generation --------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIGenerationData {
    pub testcase: TestcaseNum,
    pub subtask: SubtaskNum,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIGeneration {
    pub state: State,
    pub data: IOIGenerationData,
}

// -------------------- ioi-solution --------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISolutionData {
    pub testcase: TestcaseNum,
    pub subtask: SubtaskNum,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISolution {
    pub state: State,
    pub data: IOISolutionData,
}

// -------------------- sanity-check-solution ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct SanityCheckSolutionData {
    pub sample_testcase: TestcaseNum,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SanityCheckSolution {
    pub state: State,
    pub data: SanityCheckSolutionData,
}

// -------------------- sanity-check-validation ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct SanityCheckValidationData {
    pub sample_testcase: TestcaseNum,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SanityCheckValidation {
    pub state: State,
    pub data: SanityCheckValidationData,
}

// -------------------- ioi-result ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub enum IOITestCaseGenerationStatus {
    #[serde(rename = "WAITING")]
    Waiting,
    #[serde(rename = "GENERATING")]
    Generating,
    #[serde(rename = "GENERATED")]
    Generated,
    #[serde(rename = "VALIDATING")]
    Validating,
    #[serde(rename = "VALIDATED")]
    Validated,
    #[serde(rename = "SOLVING")]
    Solving,
    #[serde(rename = "DONE")]
    Done,
    #[serde(rename = "FAILURE")]
    Failure,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum IOISolutionTestCaseStatus {
    #[serde(rename = "WAITING")]
    Waiting,
    #[serde(rename = "SOLVING")]
    Solving,
    #[serde(rename = "SOLVED")]
    Solved,
    #[serde(rename = "CHECKING")]
    Checking,
    #[serde(rename = "ACCEPTED")]
    Accepted,
    #[serde(rename = "WRONG_ANSWER")]
    WrongAnswer,
    #[serde(rename = "PARTIAL")]
    Partial,
    #[serde(rename = "FAILED")]
    Failed,
    #[serde(rename = "SKIPPED")]
    SKipped,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOITestCaseData {
    pub status: IOITestCaseGenerationStatus,
    pub generation: Option<Execution>,
    pub validation: Option<Execution>,
    pub solution: Option<Execution>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISolutionTestCaseResult {
    pub status: IOISolutionTestCaseStatus,
    pub result: Vec<Result>,
    pub score: f32,
    pub message: String,
    pub checker_outcome: String,
    pub checker_result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOISolutionResults {
    pub name: String,
    pub path: String,
    pub language: String,
    pub score: f32,
    #[serde(with = "serialize_hash_map")]
    pub subtask_scores: HashMap<SubtaskNum, f32>,
    #[serde(with = "serialize_hash_map")]
    pub subtask_results: HashMap<SubtaskNum, IOISolutionSubtaskResult>,
    #[serde(with = "serialize_double_hash_map")]
    pub testcase_results:
        HashMap<SubtaskNum, HashMap<TestcaseNum, IOISolutionTestCaseResult>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IOIResult {
    pub task: TaskInfo,
    #[serde(with = "serialize_double_hash_map")]
    pub subtasks: HashMap<SubtaskNum, HashMap<TestcaseNum, IOITestCaseData>>,
    pub solutions: HashMap<String, SourceFileCompilation>,
    pub non_solutions: HashMap<String, SourceFileCompilation>,
    pub testing: HashMap<String, IOISolutionResults>,
}
