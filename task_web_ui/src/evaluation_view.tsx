import * as React from "react";
import { EvaluationValue, Fraction, Outcome, Score } from "./evaluation";
import { EvaluationModel, NameModel, OutcomeModel, PercentageModel, ScoreModel, TableModel, TextStreamModel, ValueExpression } from "./evaluation_model";
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
    table: TableView,
    text_stream: TextStreamView,
};

export const EvaluationNodeView = ({ models, summary }: { models: EvaluationModel[], summary: EvaluationSummary }) => (
    <React.Fragment>
        {models.map((model, i) => React.createElement(views[model.type], { key: i, model, summary }))}
    </React.Fragment>
)
