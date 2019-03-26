import * as React from "react";
import * as ReactDOM from "react-dom";
import { EvaluationReducer } from "./evaluation_process";
import { EvaluationNodeView } from "./evaluation_view";
import { testEvaluation, testMetadata } from "./test_data";
import Component from "./component";
import { TableView } from "./table_view";


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* events() {
    for (const e of testEvaluation) {
        await sleep(500);
        yield e;
    }
}

class MyComponent extends React.Component {
    reducer = new EvaluationReducer();

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
        return <TableView section={testMetadata.evaluation_sections[0]} summary={this.reducer} />;
    }
}

ReactDOM.render(<Component metadata={testMetadata} events={events()} />, document.getElementById("container"));
