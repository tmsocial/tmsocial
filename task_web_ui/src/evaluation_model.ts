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

export interface RowModel {
    cells: {
        [column: string]: EvaluationModel[];
    },
}

export interface TableModel {
    type: "table";
    columns: {
        key: string,
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
    | TableModel
    | TextStreamModel
);

