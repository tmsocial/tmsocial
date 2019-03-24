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

type FieldValue = Outcome | Score | Fraction | TimeUsage | MemoryUsage;

export interface SetFieldEvent<T extends FieldValue> {
    type: "set_field";
    name: string;
    value: T;
}

export type EvaluationEvent = SetFieldEvent<any>;

export interface EventReducer<T> {
    onEvent(event: EvaluationEvent): void;
    readonly value: T;
}

export interface FieldSet {
    readonly [name: string]: FieldValue;
}

export class FieldReducer implements EventReducer<FieldSet> {
    readonly value: { [name: string]: FieldValue } = {};

    onEvent(event: EvaluationEvent) {
        switch (event.type) {
            case "set_field":
                this.value[event.name] = event.value;
                break;
        }
    }
}

export interface EvaluationSummary {
    readonly fields: FieldSet;
}
