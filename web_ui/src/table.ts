import { EvaluationValue, Score } from "./evaluation";
import { ValueExpression } from "./evaluation_model";

export interface Table {
    type: "table";
    columns: Column[];
    groups: RowGroup[];
}

export interface HeaderColumn {
    name: Localized<string>;
};

export type Column = RowNameColumn | RowNumberColumn | MemoryUsageColumn | TimeUsageColumn | ScoreColumn | PercentageColumn | UnsupportedColumn;

export interface RowGroupHeader {
    title: Localized<string>;
}

export interface RowGroupSummary {
    title: Localized<string>;
}

export interface RowGroup {
    header?: RowGroupHeader;
    rows: Row[];
}

export interface Row {
    cells: Cell[],
}

export type Cell = ValueCell<any> | RowNameCell | RowNumberCell | ScoreCell;

export interface NamedColumn {
    name: Localized<string>;
}

export interface RowNameColumn extends NamedColumn {
    type: "row_name";
}

export interface RowNumberColumn extends NamedColumn {
    type: "row_number";
}

export interface MemoryUsageColumn extends NamedColumn {
    type: "memory_usage";
}

export interface TimeUsageColumn extends NamedColumn {
    type: "time_usage";
}

export interface ScoreColumn extends NamedColumn {
    type: "score";
    score_precision?: number,
    max_score_precision?: number,
}

export interface PercentageColumn extends NamedColumn {
    type: "percentage";
    precision?: number,
}

export interface UnsupportedColumn extends NamedColumn {
    type: "outcome" | "signal" | "return_code" | "message";
}

export interface ValueCell<T extends EvaluationValue> {
    value: ValueExpression<T>;
};

export interface RowNameCell {
    name: Localized<string>;
}

export interface RowNumberCell {
    number: number;
}

export interface ScoreCell extends ValueCell<Score> {
    max_score?: number;
}
