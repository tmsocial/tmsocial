import * as React from "react";
import ReactDOM from "react-dom";

import { EvaluationNodeView } from "./evaluation_view";
import { testMetadata, testEvaluation } from "./test_data";
import { ValueReducer } from "./evaluation_process";
import {EvaluationEvent} from "./evaluation";
import { getEvents } from "./websockets";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function* events() {
    for (const e of testEvaluation) {
        await sleep(500);
        yield e;
    }
}

class MyComponent extends React.Component {
    reducer = new ValueReducer();

    componentDidMount() {
        getEvents("ws://localhost:4242", this.onEvent.bind(this));
    }

    private onEvent(e: EvaluationEvent) {
        console.log(e);
        this.reducer.onEvent(e);
        this.forceUpdate();
    }

    render() {
        return <EvaluationNodeView model={testMetadata.evaluation_model} summary={{
            values: this.reducer.value,
        }} />;
    }
}

ReactDOM.render(<MyComponent />, document.getElementById("container"));
