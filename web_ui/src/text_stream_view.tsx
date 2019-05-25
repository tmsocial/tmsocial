import * as React from "react";
import { EvaluationSectionViewProps } from "./evaluation_table_view";
import { TextStream } from "./text_stream";

export const TextStreamView = ({ section, state }: EvaluationSectionViewProps<TextStream>) => {
    const stream = state.textStreams[section.stream];
    return (
        <pre>{stream && stream.buffer}</pre>
    );
}
