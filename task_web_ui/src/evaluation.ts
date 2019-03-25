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

export type FieldValue = Outcome | Score | Fraction | TimeUsage | MemoryUsage;

export interface ResolveFieldEvent<T extends FieldValue> {
    type: "resolve_field";
    path: (string | number)[];
    value: T;
}

export type EvaluationEvent = ResolveFieldEvent<any>;

export interface EventReducer<T> {
    onEvent(event: EvaluationEvent): void;
    readonly value: T;
}

export type FieldSet = FieldValue | {
    readonly [name: string]: FieldSet;
}

export class FieldReducer implements EventReducer<FieldSet> {
    readonly value: FieldSet = {};

    onEvent(event: EvaluationEvent) {
        switch (event.type) {
            case "resolve_field":
                let value = this.value;
                for (let i = 0; i < event.path.length - 1; i++) {
                    const key = event.path[i];
                    value = value[key] = value[key] || {};
                }
                value[event.path[event.path.length - 1]] = event.value;
                break;
        }
    }
}

export interface EvaluationSummary {
    readonly fields: FieldSet;
}
