import * as React from "react";
import { EvaluationValue, Fraction, MemoryUsage, Score, TimeUsage } from "./evaluation";
import { EvaluationModel, ListModel, MemoryUsageModel, PercentageModel, ScoreModel, TableModel, TimeUsageModel, ValueExpression, NameModel, TextStreamModel } from "./evaluation_model";
import { EvaluationSummary } from "./evaluation_process";

function l18n<T>(data: Localized<T>) {
    return data.default || data["en"];
}

function expr<U extends EvaluationValue>(summary: EvaluationSummary, expr: ValueExpression<U>): U | null {
    switch (expr.type) {
        case "constant":
            return expr.constant;
        case "ref":
            return summary.values[expr.ref] as U || null;
    }
}

interface EvaluationModelViewProps<T extends EvaluationModel> {
    model: T,
    summary: EvaluationSummary,
}

const NameView = ({ model }: EvaluationModelViewProps<NameModel>) => (
    <span className="name">{l18n(model.name)}</span>
);

const ScoreView = ({ model, summary }: EvaluationModelViewProps<ScoreModel>) => {
    const value: Score = expr(summary, model.value);
    const max_score = model.max_score;
    return (
        <span className="score">{value && value.score}{max_score && <React.Fragment> / {max_score}</React.Fragment>}</span>
    )
}

const PercentageView = ({ model, summary }: EvaluationModelViewProps<PercentageModel>) => {
    const value: Fraction = expr(summary, model.value);
    if (!value) return null;
    return (
        <span className="percentage">{(value.fraction * 100).toFixed(model.precision || 0)}%</span>
    )
}

const TimeUsageView = ({ model, summary }: EvaluationModelViewProps<TimeUsageModel>) => {
    const value: TimeUsage = expr(summary, model.value);
    if (!value) return null;
    return (
        <span className="time_usage">{value.time_usage_seconds.toFixed(3)} s</span>
    )
}

const MemoryUsageView = ({ model, summary }: EvaluationModelViewProps<MemoryUsageModel>) => {
    const value: MemoryUsage = expr(summary, model.value);
    if (!value) return null;
    return (
        // TODO: use a proper visualization of byte sizes
        <span className="memory_usage">{(value.memory_usage_bytes / 1e3).toFixed()} KB</span>
    )
}

const ListView = ({ model, summary }: EvaluationModelViewProps<ListModel>) => {
    return (
        <ul>
            {model.items.map((item, i) => <li key={i}><EvaluationNodeView model={item} summary={summary} /></li>)}
        </ul>
    );
}

const TableView = ({ model, summary }: EvaluationModelViewProps<TableModel>) => {
    return (
        <table>
            <thead>
                <tr>
                    {model.columns.map((column, j) => (
                        <th key={j}><code>{column.key} (for debug)</code></th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {model.rows.map((row, i) => (
                    <tr key={i}>
                        {model.columns.map((column, j) => (
                            <td key={j}>
                                <EvaluationNodeView model={row.cells[column.key]} summary={summary} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

const TextStreamView = ({ model, summary }: EvaluationModelViewProps<TextStreamModel>) => {
    const stream = summary.textStreams[model.stream];
    return (
        <pre>{stream && stream.buffer}</pre>
    );
}

const views: {
    [T in EvaluationModel["type"]]: React.JSXElementConstructor<EvaluationModelViewProps<any>>;
} = {
    name: NameView,
    score: ScoreView,
    percentage: PercentageView,
    time_usage: TimeUsageView,
    memory_usage: MemoryUsageView,
    list: ListView,
    table: TableView,
    text_stream: TextStreamView,
};

export class EvaluationNodeView extends React.PureComponent<{ model: EvaluationModel, summary: EvaluationSummary }> {
    render() {
        return React.createElement(views[this.props.model.type], this.props);
    }
}
