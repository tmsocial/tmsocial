import * as React from "react";
import { EvaluationSummary, FieldValue, Fraction, MemoryUsage, Score, TimeUsage } from "./evaluation";
import { EvaluationModel, FieldModelBase, MemoryUsageViewModel, PercentageViewModel, ArrayModel, RecordModel, ScopeModel, ScoreViewModel, TimeUsageViewModel } from "./metadata";

abstract class EvaluationModelView<T extends EvaluationModel> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
}

abstract class FieldView<T extends FieldModelBase<U>, U extends FieldValue> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
    get value(): U | null {
        return this.props.summary.fields[this.props.model.name] as U || null;
    }
}

export class ScoreFieldView extends FieldView<ScoreViewModel, Score> {
    render() {
        if (!this.value) return null; // TODO: use a wrapper component for fields
        return (
            <span className="score">{this.value.score}</span>
        )
    }
}

export class PercentageFieldView extends FieldView<PercentageViewModel, Fraction> {
    render() {
        if (!this.value) return null;
        return (
            <span className="percentage">{(this.value.fraction * 100).toFixed(this.props.model.precision || 0)}%</span>
        )
    }
}

export class TimeUsageFieldView extends FieldView<TimeUsageViewModel, TimeUsage> {
    render() {
        if (!this.value) return null;
        return (
            <span className="time_usage">{this.value.time_usage_seconds.toFixed(3)} s</span>
        )
    }
}

export class MemoryUsageFieldView extends FieldView<MemoryUsageViewModel, MemoryUsage> {
    render() {
        if (!this.value) return null;
        return (
            // TODO: use a proper visualization of byte sizes
            <span className="memory_usage">{(this.value.memory_usage_bytes / 1e3).toFixed()} KB</span>
        )
    }
}

export class ScopeView extends EvaluationModelView<ScopeModel> {
    render() {
        return (
            <EvaluationView
                model={this.props.model.child}
                summary={{ fields: this.props.summary.fields[this.props.model.key] || {} }}
            />
        );
    }
}

export class ArrayView extends EvaluationModelView<ArrayModel> {
    render() {
        return this.props.model.keys.map((key) => (
            <EvaluationView
                key={key}
                model={this.props.model.child_model}
                summary={{ fields: this.props.summary.fields[key] || {} }}
            />
        ))
    }
}

export class RecordView extends EvaluationModelView<RecordModel> {
    render() {
        return (
            <ul>
                {this.props.model.items.map((item, i) => <li key={i}><EvaluationView model={item} summary={this.props.summary} /></li>)}
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
    "scope": ScopeView,
    "array": ArrayView,
    "record": RecordView,
};

export class EvaluationView extends React.PureComponent<{ model: EvaluationModel, summary: EvaluationSummary }> {
    render() {
        console.log("rendering", this.props);
        return React.createElement(views[this.props.model.type], this.props);
    }
}
