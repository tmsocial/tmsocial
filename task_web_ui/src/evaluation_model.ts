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

export interface MetaModel<T extends EvaluationModel> {
    type: T["type"];
}

export interface ArrayModel<T extends EvaluationModel> {
    type: "array";
    model: MetaModel<T>;
    items: T[];
}

export interface RecordModel<T extends EvaluationModel> {
    type: "record";
    header: MetaModel<T>;
    items: {
        key: T,
        value: EvaluationModel,
    }[];
}

export interface RowModel {
    cells: {
        [column: string]: EvaluationModel;
    },
}

export interface TableModel {
    type: "table";
    columns: {
        key: string,
        model: MetaModel<EvaluationModel>,
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
    | ArrayModel<any>
    | RecordModel<any>
    | TableModel
    | TextStreamModel
);

