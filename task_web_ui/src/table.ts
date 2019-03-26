import { ValueExpression } from "./evaluation_model";
import { MemoryUsage, TimeUsage } from "./evaluation";

export interface Table {
    type: "table";
    columns: Column[];
    groups: RowGroup[];
}

export interface RowGroup {
    rows: Row[];
}

export interface Row {
    cells: Cell[],
}

export type Column = MemoryUsageColumn | TimeUsageColumn;
export type Cell = MemoryUsageCell | TimeUsageCell;

export interface MemoryUsageColumn {
    type: "memory_usage";
}

export interface MemoryUsageCell {
    value: ValueExpression<MemoryUsage>;
};

export interface TimeUsageColumn {
    type: "time_usage";
}

export interface TimeUsageCell {
    value: ValueExpression<TimeUsage>;
}
