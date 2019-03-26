import * as React from "react";
import { EvaluationValue, MemoryUsage, TimeUsage, Outcome, Score, Fraction } from "./evaluation";
import { EvaluationSummary } from "./evaluation_process";
import { EvaluationSection } from "./section";
import { Cell, Column, MemoryUsageColumn, Table, TimeUsageColumn, ValueCell, ScoreCell, PercentageCell, ScoreColumn, PercentageColumn } from "./table";
import { evaluateExpression, localize } from "./section_view";

export interface EvaluationSectionViewProps<T extends EvaluationSection> {
    section: T,
    summary: EvaluationSummary,
}

interface ColumnViewProps<T extends Column> {
    column: T;
}

interface CellViewProps<T extends Column, U extends Cell> extends ColumnViewProps<T> {
    cell: U;
    summary: EvaluationSummary;
}

const wrapValue = <T extends EvaluationValue, U>(value: T | null, mapper: (value: T) => U): U | null => (
    value !== null ? mapper(value) : null
)

const NamedColumnHeaderView = ({ column }: ColumnViewProps<TimeUsageColumn>) => (
    <th>{column.name && localize(column.name)}</th>
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

const columnViews: {
    [K in Column["type"]]: {
        header: React.JSXElementConstructor<ColumnViewProps<any>>,
        cell: React.JSXElementConstructor<CellViewProps<any, any>>,
    }
} = {
    time_usage: { header: NamedColumnHeaderView, cell: TimeUsageCellView },
    memory_usage: { header: NamedColumnHeaderView, cell: MemoryUsageCellView },
    percentage: { header: NamedColumnHeaderView, cell: PercentageCellView },
    score: { header: NamedColumnHeaderView, cell: ScoreCellView },
};

export const TableView = ({ section, summary }: EvaluationSectionViewProps<Table>) => (
    <table>
        <thead>
            <tr>
                {"header_column" in section ? (
                    <th>{localize(section.header_column.name)}</th>
                ) : null}
                {section.columns.map((column, i) => (
                    React.createElement(columnViews[column.type].header, { key: i, column })
                ))}
            </tr>
        </thead>
        {section.groups.map((group, i) => (
            <tbody key={i}>
                {group.rows.map((row, j) => (
                    <tr key={j}>
                        <th>{localize(row.name)}</th>
                        {row.cells.map((cell, k) => (
                            React.createElement(columnViews[section.columns[k].type].cell, { key: k, column: section.columns[k], cell, summary, })
                        ))}
                    </tr>
                ))}
            </tbody>
        ))}
    </table>
);