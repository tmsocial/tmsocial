import * as React from 'react';
import { EvaluationEvent } from "./evaluation";
import { EvaluationReducer } from './evaluation_process';
import { TaskMetadata } from './metadata';
import { EvaluationSection } from './section';
import { TableView } from './table_view';
import { TextStreamView } from './text_stream_view';
import { Subscription } from 'react-apollo';
import { Observable } from 'apollo-link';

type Props = {
    events: Observable<EvaluationEvent>;
    metadata: TaskMetadata;
};

const sectionViews: {
    [K in EvaluationSection["type"]]: React.JSXElementConstructor<any>
} = {
    table: TableView,
    text_stream: TextStreamView,
};

export class EvaluationComponent extends React.Component<Props> {
    private subscription: { unsubscribe: () => void } | null = null;
    private readonly reducer = new EvaluationReducer();

    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        this.subscription = this.props.events.subscribe((event) => {
            this.reducer.onEvent(event);
            this.forceUpdate();
        });
    }

    componentWillUnmount() {
        this.subscription!.unsubscribe();
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
