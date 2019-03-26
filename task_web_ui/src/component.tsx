import * as React from 'react';
import { EvaluationEvent } from "./evaluation";
import { EvaluationReducer } from './evaluation_process';
import { TaskMetadata } from './metadata';
import { EvaluationNodeView } from './evaluation_view';

type Props = {
    events: AsyncIterableIterator<EvaluationEvent> | Iterable<EvaluationEvent>;
    metadata: TaskMetadata;
};

export default class Component extends React.Component<Props> {
    reducer = new EvaluationReducer();

    constructor(props) {
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
        return <EvaluationNodeView models={this.props.metadata.evaluation_document} summary={this.reducer} />;
    }
}
