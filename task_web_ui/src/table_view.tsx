import * as React from "react";
import { EvaluationSummary } from "./evaluation_process";
import { expr } from "./evaluation_view";
import { EvaluationSection } from "./section";
import { Cell, Column, Table, TimeUsageCell, TimeUsageColumn, MemoryUsageColumn, MemoryUsageCell } from "./table";
import { EvaluationValue } from "./evaluation";

interface EvaluationSectionViewProps<T extends EvaluationSection> {
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

const TimeUsageCellView = ({ cell, summary }: CellViewProps<TimeUsageColumn, TimeUsageCell>) => (
    <td>
        {wrapValue(expr(summary, cell.value), v => (
            <React.Fragment>{v.time_usage_seconds.toFixed(3)} s</React.Fragment>
        ))}
    </td>
)

const MemoryUsageCellView = ({ cell, summary }: CellViewProps<MemoryUsageColumn, MemoryUsageCell>) => (
    <td>
        {wrapValue(expr(summary, cell.value), v => (
            <React.Fragment>{(v.memory_usage_bytes / 1e3).toFixed()} KB</React.Fragment>
        ))}
    </td>
)

const cellViews: {
    [K in Column["type"]]: React.JSXElementConstructor<CellViewProps<any, any>>
} = {
    time_usage: TimeUsageCellView,
    memory_usage: MemoryUsageCellView,
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