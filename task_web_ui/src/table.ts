import { EvaluationValue, Fraction, Score } from "./evaluation";
import { ValueExpression } from "./evaluation_model";

export interface Table {
    type: "table";
    header_column?: HeaderColumn;
    columns: Column[];
    groups: RowGroup[];
}

export interface HeaderColumn {
    name: Localized<string>;
};

export type Column = MemoryUsageColumn | TimeUsageColumn | ScoreColumn | PercentageColumn;

export interface RowGroup {
    name: Localized<string>;
    rows: Row[];
}

export interface Row {
    name: Localized<string>;
    cells: Cell[],
}

export type Cell = ValueCell<any> | ScoreCell | PercentageCell;

export interface NamedColumn {
    name: Localized<string>;
}

export interface MemoryUsageColumn extends NamedColumn {
    type: "memory_usage";
}

export interface TimeUsageColumn extends NamedColumn {
    type: "time_usage";
}

export interface ScoreColumn extends NamedColumn {
    type: "score";
}

export interface PercentageColumn extends NamedColumn {
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

