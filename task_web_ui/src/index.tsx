import 'babel-polyfill';
import * as React from "react";
import * as ReactDOM from "react-dom";
import Component from "./component";
import { EvaluationEvent } from "./evaluation";
import { TaskMetadata } from "./metadata";

export function injectEvaluationView(container: Element, metadata: TaskMetadata, eventstream: Iterable<EvaluationEvent> | AsyncIterableIterator<EvaluationEvent>) {
    ReactDOM.render(<Component events={eventstream} metadata={metadata} />, container);
}

window.injectEvaluationView = injectEvaluationView;
