import * as React from "react";
import { EvaluationSummary, FieldValue, Fraction, Score } from "./evaluation";
import { EvaluationModel, FieldModelBase, ListViewModel, ScoreViewModel, PercentageViewModel } from "./metadata";

abstract class EvaluationModelView<T extends EvaluationModel> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
}

abstract class FieldView<T extends FieldModelBase<U>, U extends FieldValue> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
    get value(): U | null {
        return this.props.summary.fields[this.props.model.name] as U || null;
    }
}

export class ScoreFieldView extends FieldView<ScoreViewModel, Score> {
    render() {
        return (
            <span className="score">{this.value.score}</span>
        )
    }
}

export class PercentageFieldView extends FieldView<PercentageViewModel, Fraction> {
    render() {
        return (
            <span className="percentage">{(this.value.fraction * 100).toFixed(this.props.model.precision || 0)}%</span>
        )
    }
}

export class ListView extends EvaluationModelView<ListViewModel> {
    render() {
        return this.props.model.items.map((item, i) => <EvaluationView model={item} summary={this.props.summary} />)
    }
}

const views: {
    [T in EvaluationModel["type"]]: any;
} = {
    "score_view": ScoreFieldView,
    "percentage_view": PercentageFieldView,
    "list_view": ListView,
};

export class EvaluationView extends React.PureComponent<{ model: EvaluationModel, summary: EvaluationSummary }> {
    render() {
        return React.createElement(views[this.props.model.type], this.props);
    }
}
