extern crate serde_json;

use crate::task_maker_ui::*;
use serde_derive::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub enum TerrySolutionStatus {
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
    #[serde(rename = "SOLVED")]
    Solved,
    #[serde(rename = "CHECKING")]
    Checking,
    #[serde(rename = "DONE")]
    Done,
    #[serde(rename = "FAILED")]
    Failed,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum TerryTestCaseStatus {
    #[serde(rename = "MISSING")]
    Missing,
    #[serde(rename = "CORRECT")]
    Correct,
    #[serde(rename = "WRONG")]
    Wrong,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryTask {
    pub name: String,
    pub title: String,
    pub generator: Option<String>,
    pub validator: Option<String>,
    pub official_solution: Option<String>,
    pub checker: Option<String>,
    pub max_score: f32,
}

// -------------------- terry-generation ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryGenerationData {
    pub name: String,
    pub seed: u32,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryGeneration {
    pub state: State,
    pub data: TerryGenerationData,
}

// -------------------- terry-validation ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryValidationData {
    pub name: String,
    pub seed: u32,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryValidation {
    pub state: State,
    pub data: TerryValidationData,
}

// -------------------- terry-evaluation ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryEvaluationData {
    pub name: String,
    pub seed: u32,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryEvaluation {
    pub state: State,
    pub data: TerryEvaluationData,
}

// -------------------- terry-checking ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryCheckingData {
    pub name: String,
    pub seed: u32,
    #[serde(default)]
    pub result: Option<Result>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryChecking {
    pub state: State,
    pub data: TerryCheckingData,
}

// -------------------- terry-solution-outcome ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct TerrySolutionOutcomeData {
    pub name: String,
    pub status: TerrySolutionStatus,
    pub score: f32,
    pub message: String,
    pub testcases: Vec<TerryTestCaseStatus>,
    #[serde(default)]
    pub result: Option<TerryTestCaseStatus>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerrySolutionOutcome {
    pub state: State,
    pub data: TerrySolutionOutcomeData,
}

// -------------------- terry-result ------------------------

#[derive(Serialize, Deserialize, Debug)]
pub struct TerrySolutionResult {
    pub name: String,
    pub path: String,
    pub language: String,
    pub status: TerrySolutionStatus,
    pub seed: u32,
    pub score: f32,
    pub message: String,
    pub generation: Option<Execution>,
    pub validation: Option<Execution>,
    pub solution: Option<Execution>,
    pub checking: Option<Execution>,
    pub testcases_status: Vec<TerryTestCaseStatus>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TerryResult {
    pub task: TaskInfo,
    pub solutions: HashMap<String, SourceFileCompilation>,
    pub non_solutions: HashMap<String, SourceFileCompilation>,
    pub testing: HashMap<String, TerrySolutionResult>,
}
