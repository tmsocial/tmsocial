import * as React from "react";
import ReactDOM from "react-dom";

import { EvaluationView } from "./evaluationView";
import { testMetadata, testEvaluation } from "./testData";
import { FieldReducer } from "./evaluation";

const reducer = new FieldReducer();

for (const e of testEvaluation) {
    reducer.onEvent(e);
}

const summary = {
    fields: reducer.value,
}

ReactDOM.render(<EvaluationView model={testMetadata.evaluation_model} summary={summary} />, document.getElementById("container"));
