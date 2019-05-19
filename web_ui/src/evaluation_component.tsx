import * as React from 'react';
import { EvaluationEvent } from "./evaluation";
import { EvaluationReducer } from './evaluation_process';
import { TaskMetadata } from './metadata';
import { EvaluationSection } from './section';
import { TableView } from './table_view';
import { TextStreamView } from './text_stream_view';

type Props = {
    events: AsyncIterableIterator<EvaluationEvent> | Iterable<EvaluationEvent>;
    metadata: TaskMetadata;
};

const sectionViews: {
    [K in EvaluationSection["type"]]: React.JSXElementConstructor<any>
} = {
    table: TableView,
    text_stream: TextStreamView,
};

export class EvaluationComponent extends React.Component<Props> {
    reducer = new EvaluationReducer();

    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        this.load();
    }

    private async load() {
        for await (const e of this.props.events) {
            this.reducer.onEvent(e);
            this.forceUpdate();
        }
    }

    render() {
        return (
            <React.Fragment>
                {this.props.metadata.evaluation_sections.map((section, i) => (
                    React.createElement(sectionViews[section.type], {
                        section, summary: this.reducer
                    })
                ))}
            </React.Fragment>
        );
    }
}
