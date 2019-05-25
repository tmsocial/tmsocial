import * as React from 'react';
import { EvaluationReducer } from './evaluation_process';
import { TableView } from './evaluation_table_view';
import { TaskMetadata } from './metadata';
import { EvaluationSection } from './section';
import { TextStreamView } from './text_stream_view';

const sectionViews: {
    [K in EvaluationSection["type"]]: React.JSXElementConstructor<any>
} = {
    table: TableView,
    text_stream: TextStreamView,
};

export const EvaluationView = ({ metadata, reducer }: { metadata: TaskMetadata, reducer: EvaluationReducer }) => (
    <React.Fragment>
        {metadata.evaluation_sections.map((section, i) => (
            React.createElement(sectionViews[section.type], {
                section, state: reducer
            })
        ))}
    </React.Fragment>
);
