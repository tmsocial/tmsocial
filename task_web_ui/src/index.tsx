import * as React from "react";
import ReactDOM from "react-dom";

import { EvaluationNodeView } from "./evaluation_view";
import { testMetadata, testEvaluation } from "./test_data";
import { ValueReducer, TextReducer, EvaluationSummary } from "./evaluation_process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function* events() {
    for (const e of testEvaluation) {
        await sleep(500);
        yield e;
    }
}

class MyComponent extends React.Component {
    reducers = {
        values: new ValueReducer(),
        textStreams: new TextReducer(),
    };

    componentDidMount() {
        this.load();    
    }

    private async load() {
        for await (const e of events()) {
            for (const k of Object.keys(this.reducers)) {
                this.reducers[k].onEvent(e);
            }
            this.forceUpdate();
        }
    }

    render() {
        const summary = {};

        for (const k of Object.keys(this.reducers)) {
            summary[k] = this.reducers[k].value;
        }


        return <EvaluationNodeView models={testMetadata.evaluation_document} summary={summary as EvaluationSummary} />;
    }
}

ReactDOM.render(<MyComponent />, document.getElementById("container"));
