import * as React from "react";
import { EvaluationSectionViewProps } from "./table_view";
import { TextStream } from "./text_stream";

export const TextStreamView = ({ section, summary }: EvaluationSectionViewProps<TextStream>) => {
    const stream = summary.textStreams[section.stream];
    return (
        <pre>{stream && stream.buffer}</pre>
    );
}
