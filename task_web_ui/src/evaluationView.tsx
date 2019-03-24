import * as React from "react";
import { EvaluationSummary, FieldValue, Score } from "./evaluation";
import { EvaluationModel, FieldModelBase } from "./metadata";

abstract class FieldView<T extends FieldValue> extends React.PureComponent<{ model: FieldModelBase<T>, summary: EvaluationSummary }>{
    get value(): T | null {
        return this.props.summary.fields[this.props.model.name] as T || null;
    }
}

export class ScoreFieldView extends FieldView<Score> {
    render() {
        return (
            <span className="score">{this.value.score}</span>
        )
    }
}

const views = {
    "p": "p",
    "score_view": ScoreFieldView,
};

export class EvaluationView extends React.PureComponent<{ model: EvaluationModel, summary: EvaluationSummary }> {
    render() {
        return React.createElement(views[this.props.model.type], this.props);
    }
}
