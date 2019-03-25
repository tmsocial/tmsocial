import * as React from "react";
import { EvaluationValue, Fraction, MemoryUsage, Score, TimeUsage } from "./evaluation";
import { EvaluationModel, ListModel, MemoryUsageModel, PercentageModel, ScoreModel, TableModel, TimeUsageModel, ValueExpression } from "./evaluation_model";
import { EvaluationSummary } from "./evaluation_process";

abstract class EvaluationModelView<T extends EvaluationModel> extends React.PureComponent<{ model: T, summary: EvaluationSummary }>{
    expr<U extends EvaluationValue>(expr: ValueExpression<U>): U | null {
        switch (expr.type) {
            case "constant":
                return expr.constant;
            case "ref":
                return this.props.summary.values[expr.ref] as U || null;
        }
    }
}

export class ScoreView extends EvaluationModelView<ScoreModel> {
    render() {
        const value: Score = this.expr(this.props.model.value);
        if (!value) return null;
        const max_score = this.props.model.max_score;
        return (
            <span className="score">{value.score}{max_score && <React.Fragment> / {max_score}</React.Fragment>}</span>
        )
    }
}

export class PercentageView extends EvaluationModelView<PercentageModel> {
    render() {
        const value: Fraction = this.expr(this.props.model.value);
        if (!value) return null;
        return (
            <span className="percentage">{(value.fraction * 100).toFixed(this.props.model.precision || 0)}%</span>
        )
    }
}

export class TimeUsageView extends EvaluationModelView<TimeUsageModel> {
    render() {
        const value: TimeUsage = this.expr(this.props.model.value);
        if (!value) return null;
        return (
            <span className="time_usage">{value.time_usage_seconds.toFixed(3)} s</span>
        )
    }
}

export class MemoryUsageView extends EvaluationModelView<MemoryUsageModel> {
    render() {
        const value: MemoryUsage = this.expr(this.props.model.value);
        if (!value) return null;
        return (
            // TODO: use a proper visualization of byte sizes
            <span className="memory_usage">{(value.memory_usage_bytes / 1e3).toFixed()} KB</span>
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
