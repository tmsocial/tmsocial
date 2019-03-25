import { EvaluationValue, Score, Fraction, TimeUsage, MemoryUsage } from "./evaluation";

export interface ValueReference {
    type: "ref";
    ref: string;
}

export interface ConstantValue<T extends EvaluationValue> {
    type: "constant";
    constant: T;
}

export type ValueExpression<T extends EvaluationValue> = ConstantValue<T> | ValueReference

export interface ScoreModel {
    type: "score";
    value: ValueExpression<Score>;
    max_score?: number;
}

export interface PercentageModel {
    type: "percentage";
    value: ValueExpression<Fraction>;
    precision?: number;
}

export interface TimeUsageModel {
    type: "time_usage";
    value: ValueExpression<TimeUsage>;
}

export interface MemoryUsageModel {
    type: "memory_usage";
    value: ValueExpression<MemoryUsage>;
}

export interface ListModel {
    type: "list";
    items: EvaluationModel[];
}

export interface ValueColumnModel<T extends EvaluationModel> {
    type: T["type"];
}

export type ColumnModel = ValueColumnModel<EvaluationModel>;

export interface RowModel {
    cells: {
        [column: string]: EvaluationModel;
    },
}

export interface TableModel {
    type: "table";
    columns: { key: string, model: ColumnModel }[];
    rows: RowModel[];
}

export type FieldModel = ScoreModel | PercentageModel | TimeUsageModel | MemoryUsageModel;
export type EvaluationModel = FieldModel | ListModel | TableModel;

