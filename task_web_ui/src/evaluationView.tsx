import * as React from "react";
import { EvaluationSummary, Score } from "./evaluation";

abstract class FieldView<T> extends React.PureComponent<{model: FieldModel, summary: EvaluationSummary}>{
    get value(): T {
        return this.props.summary.fields[this.props.model.name] || null;
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

export class EvaluationView extends React.PureComponent<{model: EvaluationModel, summary: EvaluationSummary}> {
    render() {
        return React.createElement(views[this.props.model.type], this.props);
    }
}
