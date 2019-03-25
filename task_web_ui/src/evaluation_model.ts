import { EvaluationValue, Score, Fraction, TimeUsage, MemoryUsage } from "./evaluation";

export interface FieldModelBase<T extends EvaluationValue> {
    name: string;
}

export interface ScoreModel extends FieldModelBase<Score> {
    type: "score";
    max_score?: number;
}

export interface PercentageModel extends FieldModelBase<Fraction> {
    type: "percentage";
    precision?: number;
}

export interface TimeUsageModel extends FieldModelBase<TimeUsage> {
    type: "time_usage";
}

export interface MemoryUsageModel extends FieldModelBase<MemoryUsage> {
    type: "memory_usage";
}

export interface ListModel {
    type: "list";
    items: EvaluationModel[];
}

export interface ScoreColumnModel {
    type: "score";
}

export interface TimeUsageColumnModel {
    type: "time_usage";
}

export type ColumnModel = ScoreColumnModel | TimeUsageColumnModel;

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

