import * as React from "react";
import * as ReactDOM from "react-dom";
import { EvaluationEvent } from "./evaluation";
import { TaskMetadata } from "./metadata";
import Component from "./component";


export function injectEvaluationView(container: Element, metadata: TaskMetadata, eventstream: EvaluationEvent[]) {
    ReactDOM.render(<Component events={eventstream} metadata={metadata} />, container);
}
