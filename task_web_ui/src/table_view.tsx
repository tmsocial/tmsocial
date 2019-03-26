import * as React from "react";
import { EvaluationValue, MemoryUsage, TimeUsage, Outcome, Score, Fraction } from "./evaluation";
import { EvaluationSummary } from "./evaluation_process";
import { EvaluationSection } from "./section";
import { Cell, Column, MemoryUsageColumn, Table, TimeUsageColumn, ValueCell, ScoreCell, PercentageCell, ScoreColumn, PercentageColumn } from "./table";
import { evaluateExpression } from "./section_view";

export interface EvaluationSectionViewProps<T extends EvaluationSection> {
    section: T,
    summary: EvaluationSummary,
}

interface CellViewProps<T extends Column, U extends Cell> {
    column: T;
    cell: U;
    summary: EvaluationSummary;
}

const wrapValue = <T extends EvaluationValue, U>(value: T | null, mapper: (value: T) => U): U | null => (
    value !== null ? mapper(value) : null
)

const TimeUsageCellView = ({ cell, summary }: CellViewProps<TimeUsageColumn, ValueCell<TimeUsage>>) => (
    <td>
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{v.time_usage_seconds.toFixed(3)} s</React.Fragment>
        ))}
    </td>
)

const MemoryUsageCellView = ({ cell, summary }: CellViewProps<MemoryUsageColumn, ValueCell<MemoryUsage>>) => (
    <td>
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{(v.memory_usage_bytes / 1e3).toFixed()} KB</React.Fragment>
        ))}
    </td>
)

const ScoreCellView = ({ cell, summary }: CellViewProps<ScoreColumn, ScoreCell>) => (
    <td>
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{v.score}</React.Fragment>
        ))}{"max_score" in cell && <React.Fragment> / {cell.max_score}</React.Fragment>}
    </td>
)

const PercentageCellView = ({ cell, summary }: CellViewProps<PercentageColumn, PercentageCell>) => (
    <td>
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{(v.fraction * 100).toFixed("precision" in cell ? cell.precision : 0)}%</React.Fragment>
        ))}
    </td>
)

const cellViews: {
    [K in Column["type"]]: React.JSXElementConstructor<CellViewProps<any, any>>
} = {
    time_usage: TimeUsageCellView,
    memory_usage: MemoryUsageCellView,
    percentage: PercentageCellView,
    score: ScoreCellView,
};

export const TableView = ({ section, summary }: EvaluationSectionViewProps<Table>) => (
    <table>
        {section.groups.map((group, i) => (
            <tbody key={i}>
                {group.rows.map((row, j) => (
                    <tr key={j}>
                        {row.cells.map((cell, k) => (
                            React.createElement(cellViews[section.columns[k].type], { column: section.columns[k], cell, summary, key: k })
                        ))}
                    </tr>
                ))}
            </tbody>
        ))}
    </table>
);