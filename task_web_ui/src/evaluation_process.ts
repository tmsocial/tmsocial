import { EvaluationEvent, EvaluationValue } from "./evaluation";

export interface EventReducer<T> {
    onEvent(event: EvaluationEvent): void;
    readonly value: T;
}

export interface ValueSet {
    readonly [key: string]: EvaluationValue;
}

export interface StreamBuffer {
    buffer: string;
}

export interface StreamBufferSet {
    readonly [stream: string]: StreamBuffer;
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

export class TextReducer implements EventReducer<StreamBufferSet> {
    readonly value: { [stream: string]: StreamBuffer } = {};

    onEvent(event: EvaluationEvent) {
        switch (event.type) {
            case "text":
                const stream = event.stream;
                this.value[stream] = this.value[stream] || {
                    buffer: "",
                };
                // FIXME: quadratic complexity? Maintain list of chunks and join on-demand.
                this.value[stream].buffer += event.text;
                break;
        }
    }

}

export interface EvaluationSummary {
    readonly values: ValueSet;
    readonly textStreams: StreamBufferSet;
}
