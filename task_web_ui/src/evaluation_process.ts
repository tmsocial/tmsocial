import { EvaluationEvent, EvaluationValue } from "./evaluation";

export interface EvaluationSummary {
    readonly values: { readonly [key: string]: EvaluationValue };
    readonly textStreams: { readonly [stream: string]: StreamBuffer };
}

export class EvaluationReducer implements EvaluationSummary {
    readonly values: { [key: string]: EvaluationValue } = {};
    readonly textStreams: { [stream: string]: StreamBuffer } = {};

    onEvent(event: EvaluationEvent): void {
        switch (event.type) {
            case "value":
                if (this.values[event.key]) throw Error("Value already defined");
                this.values[event.key] = event.value;
                break;
            case "text":
                const stream = event.stream;
                this.textStreams[stream] = this.textStreams[stream] || {
                    buffer: "",
                };
                // FIXME: quadratic complexity? Maintain list of chunks and join on-demand?
                this.textStreams[stream].buffer += event.text;
                break;
        }
    }
}

export interface ValueSet {
    readonly [key: string]: EvaluationValue;
}

export interface StreamBuffer {
    buffer: string;
}
