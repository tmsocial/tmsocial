import * as React from "react";
import ReactDOM from "react-dom";

import { EvaluationNodeView } from "./evaluationView";
import { testMetadata, testEvaluation } from "./testData";
import { FieldReducer } from "./evaluation";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function* events() {
    for (const e of testEvaluation) {
        await sleep(500);
        yield e;
    }
}

class MyComponent extends React.Component {
    reducer = new FieldReducer();

    componentDidMount() {
        this.load();
    }

    private async load() {
        for await (const e of events()) {
            this.reducer.onEvent(e);
            this.forceUpdate();
        }
    }

    render() {
        return <EvaluationNodeView model={testMetadata.evaluation_model} summary={{
            fields: this.reducer.value,
        }} />;
    }
}

ReactDOM.render(<MyComponent />, document.getElementById("container"));
