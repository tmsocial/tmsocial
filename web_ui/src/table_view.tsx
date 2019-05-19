import * as React from "react";
import { EvaluationValue, MemoryUsage, TimeUsage, Fraction } from "./evaluation";
import { EvaluationSummary } from "./evaluation_process";
import { EvaluationSection } from "./section";
import { evaluateExpression, localize } from "./section_view";
import { Cell, Column, MemoryUsageColumn, PercentageColumn, RowGroup, RowNameCell, RowNameColumn, RowNumberCell, RowNumberColumn, ScoreCell, ScoreColumn, Table, TimeUsageColumn, ValueCell } from "./table";

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

const RowNameCellView = ({ cell }: CellViewProps<RowNameColumn, RowNameCell>) => (
    <th>{cell.name && localize(cell.name)}</th>
)

const RowNumberCellView = ({ cell }: CellViewProps<RowNumberColumn, RowNumberCell>) => (
    <th>{cell.number}</th>
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

const ScoreCellView = ({ column, cell, summary }: CellViewProps<ScoreColumn, ScoreCell>) => (
    <td>
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{v.score.toFixed("score_precision" in column ? column.score_precision : 0)}</React.Fragment>
        ))}{
            "max_score" in cell
                ? <React.Fragment> / {
                    cell.max_score.toFixed(
                        "max_score_precision" in column
                            ? column.max_score_precision
                            : "score_precision" in column
                                ? column.score_precision
                                : 0
                    )
                }</React.Fragment>
                : null
        }
    </td>
)

const PercentageCellView = ({ column, cell, summary }: CellViewProps<PercentageColumn, ValueCell<Fraction>>) => (
    <td>
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{(v.fraction * 100).toFixed(column.precision || 0)}%</React.Fragment>
        ))}
    </td>
)

const columnViews: {
    [K in Column["type"]]: {
        header: React.JSXElementConstructor<ColumnViewProps<any>>,
        cell: React.JSXElementConstructor<CellViewProps<any, any>>,
    }
} = {
    row_name: { header: NamedColumnHeaderView, cell: RowNameCellView },
    row_number: { header: NamedColumnHeaderView, cell: RowNumberCellView },
    time_usage: { header: NamedColumnHeaderView, cell: TimeUsageCellView },
    memory_usage: { header: NamedColumnHeaderView, cell: MemoryUsageCellView },
    percentage: { header: NamedColumnHeaderView, cell: PercentageCellView },
    score: { header: NamedColumnHeaderView, cell: ScoreCellView },
};

const GroupHeaderView = ({ section, group }: { section: Table, group: RowGroup }) => (
    <React.Fragment>
        {
            "header" in group &&
            <tr><th colSpan={section.columns.length}>{localize(group.header.title)}</th></tr>
        }
        <tr>
            {section.columns.map((column, i) => (
                React.createElement(columnViews[column.type].header, { key: i, column })
            ))}
        </tr>
    </React.Fragment>
)

export const TableView = ({ section, summary }: EvaluationSectionViewProps<Table>) => (
    <table>
        {section.groups.map((group, i) => (
            <tbody key={i}>
                <GroupHeaderView section={section} group={group} />
                {group.rows.map((row, j) => (
                    <tr key={j}>
                        {row.cells.map((cell, k) => (
                            React.createElement(columnViews[section.columns[k].type].cell, { key: k, column: section.columns[k], cell, summary, })
                        ))}
                    </tr>
                ))}
            </tbody>
        ))}
    </table>
);