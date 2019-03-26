import { ValueExpression } from "./evaluation_model";
import { MemoryUsage, TimeUsage, EvaluationValue, Score, Fraction } from "./evaluation";

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

export type Column = MemoryUsageColumn | TimeUsageColumn | ScoreColumn | PercentageColumn;
export type Cell = ValueCell<any> | ScoreCell | PercentageCell;

export interface MemoryUsageColumn {
    type: "memory_usage";
}

export interface TimeUsageColumn {
    type: "time_usage";
}

export interface ScoreColumn {
    type: "score";
}

export interface PercentageColumn {
    type: "percentage";
}

export interface ValueCell<T extends EvaluationValue> {
    value: ValueExpression<T>;
};

export interface ScoreCell extends ValueCell<Score> {
    max_score?: number;
}

export interface PercentageCell extends ValueCell<Fraction> {
    precision?: number;
}

