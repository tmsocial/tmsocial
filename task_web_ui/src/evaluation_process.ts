import { EvaluationEvent, EvaluationValue } from "./evaluation";

export interface EventReducer<T> {
    onEvent(event: EvaluationEvent): void;
    readonly value: T;
}

export interface ValueSet {
    readonly [key: string]: EvaluationValue;
}

export class ValueReducer implements EventReducer<ValueSet> {
    readonly value: { [key: string]: EvaluationValue } = {};

    onEvent(event: EvaluationEvent) {
        switch (event.type) {
            case "value":
                this.value[event.key] = event.value;
                break;
        }
    }
}

export interface EvaluationSummary {
    readonly values: ValueSet;
}
