import { EvaluationEvent, EvaluationValue } from "./evaluation";

export interface EvaluationState {
    readonly values: { readonly [key: string]: any };
    readonly textStreams: { readonly [stream: string]: StreamBuffer };
}

export class EvaluationReducer implements EvaluationState {
    private constructor(
        readonly values: { [key: string]: any },
        readonly textStreams: { [stream: string]: StreamBuffer },
    ) { }

    static initial() {
        return new EvaluationReducer({}, {});
    }

    copy() {
        return new EvaluationReducer(this.values, this.textStreams);
    }

    onEvent(event: EvaluationEvent): void {
        switch (event.type) {
            case 'value': {
                if (this.values[event.key]) { throw Error('Value already defined') };
                this.values[event.key] = event.value;
                return;
            }
            case 'text': {
                const stream = event.stream;
                this.textStreams[stream] = this.textStreams[stream] || {
                    buffer: '',
                };
                // FIXME: quadratic complexity? Maintain list of chunks and join on-demand?
                this.textStreams[stream].buffer += event.text;
                return;
            }
        }
    }
}

export interface ValueSet {
    readonly [key: string]: EvaluationValue;
}

export interface StreamBuffer {
    buffer: string;
}
