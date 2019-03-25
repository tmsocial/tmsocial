import * as React from "react";
import { EvaluationSummary, EvaluationValue, Fraction, MemoryUsage, Score, TimeUsage } from "./evaluation";
import { EvaluationModel, FieldModelBase, ListModel, MemoryUsageModel, PercentageModel, ScoreModel, TimeUsageModel, TableModel } from "./metadata";

abstract class EvaluationModelView<T extends EvaluationModel> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
}

abstract class FieldView<T extends FieldModelBase<U>, U extends EvaluationValue> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
    get value(): U | null {
        return this.props.summary.values[this.props.model.name] as U || null;
    }
}

export class ScoreView extends FieldView<ScoreModel, Score> {
    render() {
        if (!this.value) return null; // TODO: use a wrapper component for fields
        const max_score = this.props.model.max_score;
        return (
            <span className="score">{this.value.score}{
                max_score && <React.Fragment> / {max_score}</React.Fragment>
            }</span>
        )
    }
}

export class PercentageView extends FieldView<PercentageModel, Fraction> {
    render() {
        if (!this.value) return null;
        return (
            <span className="percentage">{(this.value.fraction * 100).toFixed(this.props.model.precision || 0)}%</span>
        )
    }
}

export class TimeUsageView extends FieldView<TimeUsageModel, TimeUsage> {
    render() {
        if (!this.value) return null;
        return (
            <span className="time_usage">{this.value.time_usage_seconds.toFixed(3)} s</span>
        )
    }
}

export class MemoryUsageView extends FieldView<MemoryUsageModel, MemoryUsage> {
    render() {
        if (!this.value) return null;
        return (
            // TODO: use a proper visualization of byte sizes
            <span className="memory_usage">{(this.value.memory_usage_bytes / 1e3).toFixed()} KB</span>
        )
    }
}

export class ListView extends EvaluationModelView<ListModel> {
    render() {
        return (
            <ul>
                {this.props.model.items.map((item, i) => <li key={i}><EvaluationNodeView model={item} summary={this.props.summary} /></li>)}
            </ul>
        );
    }
}

export class TableView extends EvaluationModelView<TableModel> {
    render() {
        return (
            <table>
                <thead>
                    <tr>
                        {this.props.model.columns.map((column, j) => (
                            <th key={j}><code>{column.key} (for debug)</code></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {this.props.model.rows.map((row, i) => (
                        <tr key={i}>
                            {this.props.model.columns.map((column, j) => (
                                <td key={j}>
                                    <EvaluationNodeView model={row.cells[column.key]} summary={this.props.summary} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
}

const views: {
    [T in EvaluationModel["type"]]: any;
} = {
    score: ScoreView,
    percentage: PercentageView,
    time_usage: TimeUsageView,
    memory_usage: MemoryUsageView,
    list: ListView,
    table: TableView,
};

export class EvaluationNodeView extends React.PureComponent<{ model: EvaluationModel, summary: EvaluationSummary }> {
    render() {
        return React.createElement(views[this.props.model.type], this.props);
    }
}
