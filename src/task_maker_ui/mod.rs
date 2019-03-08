extern crate serde_json;

pub mod hash_map_serializers;
pub mod ioi;
pub mod terry;

use crate::task_maker_ui::ioi::*;
use crate::task_maker_ui::terry::*;
use serde_derive::{Deserialize, Serialize};

// -------------------- common stuff --------------------------

pub type TestcaseNum = i32;
pub type SubtaskNum = i32;

#[derive(Serialize, Deserialize, Debug)]
pub enum State {
    #[serde(rename = "WAITING")]
    Waiting,
    #[serde(rename = "SKIPPED")]
    Skipped,
    #[serde(rename = "START")]
    Start,
    #[serde(rename = "WARNING")]
    Warning,
    #[serde(rename = "ERROR")]
    Error,
    #[serde(rename = "FAILURE")]
    Failure,
    #[serde(rename = "SUCCESS")]
    Success,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum ResultStatus {
    #[serde(rename = "SUCCESS")]
    Success,
    #[serde(rename = "SIGNAL")]
    Signal,
    #[serde(rename = "RETURN_CODE")]
    ReturnCode,
    #[serde(rename = "TIME_LIMIT")]
    TimeLimit,
    #[serde(rename = "WALL_LIMIT")]
    WallLimit,
    #[serde(rename = "MEMORY_LIMIT")]
    MemoryLimit,
    #[serde(rename = "MISSING_FILES")]
    MissingFiles,
    #[serde(rename = "INVALID_REQUEST")]
    InvalidRequest,
    #[serde(rename = "INTERNAL_ERROR")]
    InternalError,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Resources {
    pub cpu_time: f32,
    pub sys_time: f32,
    pub wall_time: f32,
    pub memory: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Result {
    pub status: ResultStatus,
    pub signal: Option<u32>,
    pub return_code: Option<u32>,
    pub error: Option<String>,
    pub resources: Resources,
    pub was_cached: bool,
    pub was_killed: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Execution {
    #[serde(default)]
    pub stderr: Option<String>,
    #[serde(default)]
    pub stdout: Option<String>,
    pub result: Result,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum SourceFileCompilationStatus {
    #[serde(rename = "WAITING")]
    Waiting,
    #[serde(rename = "COMPILING")]
    Compiling,
    #[serde(rename = "DONE")]
    Done,
    #[serde(rename = "FAILURE")]
    Failure,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SourceFileCompilation {
    pub status: SourceFileCompilationStatus,
    pub compilation: Option<Execution>,
}

// -------------------- compilation --------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct CompilationData {
    pub file: String,
    pub path: String,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Compilation {
    pub state: State,
    pub data: CompilationData,
}

// -------------------- statement-compilation ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct StatementCompilationData {
    pub language: String,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StatementCompilation {
    pub state: State,
    pub data: StatementCompilationData,
}

// -------------------- asy-cropping ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct AsyCroppingData {
    pub file: String,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AsyCropping {
    pub state: State,
    pub data: AsyCroppingData,
}

// -------------------- warning ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct WarningData {
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Warning {
    pub state: State,
    pub data: WarningData,
}

// -------------------- error ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct ErrorData {
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Error {
    pub state: State,
    pub data: ErrorData,
}

// --------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "action")]
pub enum TaskMakerMessage {
    #[serde(rename = "testcase-outcome")]
    IOITestCaseOutcome(IOITestCaseOutcome),
    #[serde(rename = "subtask-outcome")]
    IOISubtaskOutcome(IOISubtaskOutcome),
    #[serde(rename = "checking")]
    IOIChecking(IOIChecking),
    #[serde(rename = "evaluation")]
    IOIEvaluation(IOIEvaluation),
    #[serde(rename = "validation")]
    IOIValidation(IOIValidation),
    #[serde(rename = "generation")]
    IOIGeneration(IOIGeneration),
    #[serde(rename = "solution")]
    IOISolution(IOISolution),
    #[serde(rename = "result")]
    IOIResult(IOIResult),

    #[serde(rename = "terry-generation")]
    TerryGeneration(TerryGeneration),
    #[serde(rename = "terry-validation")]
    TerryValidation(TerryValidation),
    #[serde(rename = "terry-evaluation")]
    TerryEvaluation(TerryEvaluation),
    #[serde(rename = "terry-checking")]
    TerryChecking(TerryChecking),
    #[serde(rename = "terry-solution-outcome")]
    TerrySolutionOutcome(TerrySolutionOutcome),
    #[serde(rename = "terry-result")]
    TerryResult(TerryResult),

    #[serde(rename = "compilation")]
    Compilation(Compilation),
    #[serde(rename = "sanity-check-solution")]
    SanityCheckSolution(SanityCheckSolution),
    #[serde(rename = "sanity-check-validation")]
    SanityCheckValidation(SanityCheckValidation),
    #[serde(rename = "statement-compilation")]
    StatementCompilation(StatementCompilation),
    #[serde(rename = "asy-cropping")]
    AsyCropping(AsyCropping),
    #[serde(rename = "warning")]
    Warning(Warning),
    #[serde(rename = "error")]
    Error(Error),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum TaskInfo {
    #[serde(rename = "IOI")]
    IOITask(IOITask),
    #[serde(rename = "Terry")]
    TerryTask(TerryTask),
}
