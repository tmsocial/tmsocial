import * as React from "react";
import { EvaluationValue, Fraction, MemoryUsage, Outcome, Score, TimeUsage } from "./evaluation";
import { EvaluationModel, MemoryUsageModel, NameModel, OutcomeModel, PercentageModel, ScoreModel, TableModel, TextStreamModel, TimeUsageModel, ValueExpression } from "./evaluation_model";
import { EvaluationSummary } from "./evaluation_process";

export function l18n<T>(data: Localized<T>) {
    if ("default" in data) {
        return data.default;
    }
    return data["en"];
}

export function expr<U extends EvaluationValue>(summary: EvaluationSummary, expr: ValueExpression<U>): U | null {
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

const OutcomeView = ({ model, summary }: EvaluationModelViewProps<OutcomeModel>) => {
    const value: Outcome | null = expr(summary, model.value);
    return (
        <span className="score">{value && value.outcome}</span>
    )
}

const ScoreView = ({ model, summary }: EvaluationModelViewProps<ScoreModel>) => {
    const value: Score | null = expr(summary, model.value);
    const max_score = model.max_score;
    return (
        <span className="score">{value && value.score}{max_score && <React.Fragment> / {max_score}</React.Fragment>}</span>
    )
}

const PercentageView = ({ model, summary }: EvaluationModelViewProps<PercentageModel>) => {
    const value: Fraction | null = expr(summary, model.value);
    if (!value) return null;
    return (
        <span className="percentage">{(value.fraction * 100).toFixed(model.precision || 0)}%</span>
    )
}

const TimeUsageView = ({ model, summary }: EvaluationModelViewProps<TimeUsageModel>) => {
    const value: TimeUsage | null = expr(summary, model.value);
    if (!value) return null;
    return (
        <span className="time_usage">{value.time_usage_seconds.toFixed(3)} s</span>
    )
}

const MemoryUsageView = ({ model, summary }: EvaluationModelViewProps<MemoryUsageModel>) => {
    const value: MemoryUsage | null = expr(summary, model.value);
    if (!value) return null;
    return (
        // TODO: use a proper visualization of byte sizes
        <span className="memory_usage">{(value.memory_usage_bytes / 1e3).toFixed()} KB</span>
    )
}

const TableView = ({ model, summary }: EvaluationModelViewProps<TableModel>) => {
    return (
        <table>
            <tbody>
                {model.rows.map((row, i) => (
                    <tr key={i}>
                        {model.columns.map((column, j) => (
                            <td key={j}>
                                <EvaluationNodeView models={row.cells[column.key]} summary={summary} />
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
    outcome: OutcomeView,
    score: ScoreView,
    percentage: PercentageView,
    time_usage: TimeUsageView,
    memory_usage: MemoryUsageView,
    table: TableView,
    text_stream: TextStreamView,
};

export const EvaluationNodeView = ({ models, summary }: { models: EvaluationModel[], summary: EvaluationSummary }) => (
    <React.Fragment>
        {models.map((model, i) => React.createElement(views[model.type], { key: i, model, summary }))}
    </React.Fragment>
)
