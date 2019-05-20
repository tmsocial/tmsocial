import * as React from "react";
import { EvaluationValue, MemoryUsage, TimeUsage, Fraction, Outcome, Message } from "./evaluation";
import { EvaluationSummary } from "./evaluation_process";
import { EvaluationSection } from "./section";
import { evaluateExpression } from "./section_view";
import { Cell, Column, MemoryUsageColumn, PercentageColumn, RowGroup, RowNameCell, RowNameColumn, RowNumberCell, RowNumberColumn, ScoreCell, ScoreColumn, Table, TimeUsageColumn, ValueCell, OutcomeColumn, MessageColumn } from "./table";
import { localize } from "./l10n";

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
    <th className="named_column_header">{column.name && localize(column.name)}</th>
)

const RowNameCellView = ({ cell }: CellViewProps<RowNameColumn, RowNameCell>) => (
    <th className="row_name_cell">{cell.name && localize(cell.name)}</th>
)

const RowNumberCellView = ({ cell }: CellViewProps<RowNumberColumn, RowNumberCell>) => (
    <th className="row_number_cell">{cell.number}</th>
)

const OutcomeCellView = ({ cell, summary }: CellViewProps<OutcomeColumn, ValueCell<Outcome>>) => (
    <td className="outcome_cell">
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{v.outcome}</React.Fragment>
        ))}
    </td>
)

const MessageCellView = ({ cell, summary }: CellViewProps<MessageColumn, ValueCell<Message>>) => (
    <td className="message_cell">
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{localize(v.message)}</React.Fragment>
        ))}
    </td>
)

const TimeUsageCellView = ({ cell, summary }: CellViewProps<TimeUsageColumn, ValueCell<TimeUsage>>) => (
    <td className="time_usage_cell">
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{v.time_usage_seconds.toFixed(3)} s</React.Fragment>
        ))}
    </td>
)

const MemoryUsageCellView = ({ cell, summary }: CellViewProps<MemoryUsageColumn, ValueCell<MemoryUsage>>) => (
    <td className="memory_usage_cell">
        {wrapValue(evaluateExpression(summary, cell.value), v => (
            <React.Fragment>{(v.memory_usage_bytes / 1e3).toFixed()} KB</React.Fragment>
        ))}
    </td>
)

const ScoreCellView = ({ column, cell, summary }: CellViewProps<ScoreColumn, ScoreCell>) => (
    <td className="score_cell">
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

const DummyCellView = ({ column, cell, summary }: CellViewProps<Column, Cell>) => (
    <td>?</td>
)

const PercentageCellView = ({ column, cell, summary }: CellViewProps<PercentageColumn, ValueCell<Fraction>>) => (
    <td className="percentage_cell">
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
    outcome: { header: NamedColumnHeaderView, cell: OutcomeCellView },
    message: { header: NamedColumnHeaderView, cell: MessageCellView },

    // unsupported
    signal: { header: NamedColumnHeaderView, cell: DummyCellView },
    return_code: { header: NamedColumnHeaderView, cell: DummyCellView },
};

const GroupHeaderView = ({ section, group }: { section: Table, group: RowGroup }) => (
    <React.Fragment>
        {
            "header" in group &&
            <tr><th colSpan={section.columns.length}>{localize(group.header!.title)}</th></tr>
        }
        <tr className="group_header_row">
            {section.columns.map((column, i) => (
                React.createElement(columnViews[column.type].header, { key: i, column })
            ))}
        </tr>
    </React.Fragment>
)

export const TableView = ({ section, summary }: EvaluationSectionViewProps<Table>) => (
    <table className="evaluation_table">
        {section.groups.map((group, i) => (
            <tbody key={i} className="evaluation_group">
                <GroupHeaderView section={section} group={group} />
                {group.rows.map((row, j) => (
                    <tr key={j} className="evaluation_row">
                        {row.cells.map((cell, k) => (
                            React.createElement(columnViews[section.columns[k].type].cell, { key: k, column: section.columns[k], cell, summary, })
                        ))}
                    </tr>
                ))}
            </tbody>
        ))}
    </table>
);