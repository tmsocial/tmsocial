import { EvaluationValue, Score, Fraction, TimeUsage, MemoryUsage, Outcome } from "./evaluation";

export interface ValueReference {
    type: "ref";
    ref: string;
}

export interface ConstantValue<T extends EvaluationValue> {
    type: "constant";
    constant: T;
}

export type ValueExpression<T extends EvaluationValue> = ConstantValue<T> | ValueReference

export interface NameModel {
    type: "name";
    name: Localized<string>;
}

export interface OutcomeModel {
    type: "outcome";
    value: ValueExpression<Outcome>;
}

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
    columns: {
        key: string,
        model: ColumnModel,
        header: EvaluationModel,
     }[];
    rows: RowModel[];
}

export interface TextStreamModel {
    type: "text_stream";
    stream: string;
}

export type EvaluationModel = (
    | NameModel
    | OutcomeModel
    | ScoreModel
    | PercentageModel
    | TimeUsageModel
    | MemoryUsageModel
    | ListModel
    | TableModel
    | TextStreamModel
);

