interface EvaluationEvent {
    type: string;
}

interface FieldValue<T extends FieldValue<T>> {
    type: string;
}

type OutcomeValue = "done" | "success" | "fail" | "partial" | "skip";

export interface Outcome extends FieldValue<Outcome> {
    type: "outcome";
    outcome: OutcomeValue;
}

export interface Score extends FieldValue<Score> {
    type: "score";
    score: number;
}

export interface Fraction extends FieldValue<Fraction> {
    type: "fraction";
    fraction: number;
}

export interface TimeUsage extends FieldValue<TimeUsage> {
    type: "time_usage";
    time_usage_seconds: number;
}

export interface MemoryUsage extends FieldValue<MemoryUsage> {
    type: "memory_usage";
    memory_usage_bytes: number;
}

export interface SetFieldEvent<T extends FieldValue<T>> extends EvaluationEvent {
    type: "set_field";
    name: string;
    value: T;
}

export interface EventReducer<T> {
    onEvent(event: EvaluationEvent): void;
    readonly value: T;
}

export interface FieldSet {
    readonly [name: string]: FieldValue<any>
}

export class FieldReducer implements EventReducer<FieldSet> {
    readonly value: { [name: string]: FieldValue<any> } = {};

    onEvent<T extends FieldValue<T>>(event) {
        if (event.type == "set_field") {
            this.value[event.name] = event.value;
        }
    }
}

export interface EvaluationSummary {
    readonly [name: string]: any;
}
