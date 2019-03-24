import * as React from "react";
import { EvaluationSummary, FieldValue, Fraction, Score, TimeUsage, MemoryUsage } from "./evaluation";
import { EvaluationModel, FieldModelBase, ListViewModel, ScoreViewModel, PercentageViewModel, TimeUsageViewModel, MemoryUsageViewModel } from "./metadata";

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

export class TimeUsageFieldView extends FieldView<TimeUsageViewModel, TimeUsage> {
    render() {
        return (
            <span className="time_usage">{this.value.time_usage_seconds.toFixed(3)} s</span>
        )
    }
}

export class MemoryUsageFieldView extends FieldView<MemoryUsageViewModel, MemoryUsage> {
    render() {
        return (
            // TODO: use a proper visualization of byte sizes
            <span className="memory_usage">{(this.value.memory_usage_bytes / 1e3).toFixed()} KB</span>
        )
    }
}

export class ListView extends EvaluationModelView<ListViewModel> {
    render() {
        return (
            <ul>
                {this.props.model.items.map((item, i) => <li><EvaluationView model={item} summary={this.props.summary} /></li>)}
            </ul>
        );
    }
}

const views: {
    [T in EvaluationModel["type"]]: any;
} = {
    "score": ScoreFieldView,
    "percentage": PercentageFieldView,
    "time_usage": TimeUsageFieldView,
    "memory_usage": MemoryUsageFieldView,
    "list": ListView,
};

export class EvaluationView extends React.PureComponent<{ model: EvaluationModel, summary: EvaluationSummary }> {
    render() {
        return React.createElement(views[this.props.model.type], this.props);
    }
}
