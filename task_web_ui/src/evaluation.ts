export type OutcomeValue = "done" | "success" | "fail" | "partial" | "skip";

export interface Outcome {
    type: "outcome";
    outcome: OutcomeValue;
}

export interface Score {
    type: "score";
    score: number;
}

export interface Fraction {
    type: "fraction";
    fraction: number;
}

export interface TimeUsage {
    type: "time_usage";
    time_usage_seconds: number;
}

export interface MemoryUsage {
    type: "memory_usage";
    memory_usage_bytes: number;
}

export type EvaluationValue = Outcome | Score | Fraction | TimeUsage | MemoryUsage;

export interface ValueEvent<T extends EvaluationValue> {
    type: "value";
    key: string;
    value: T;
}

export type EvaluationEvent = ValueEvent<any>;
