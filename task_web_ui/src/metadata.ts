import { EvaluationValue, Fraction, Score, TimeUsage, MemoryUsage } from "./evaluation";

interface AwareLocalized<T> {
    [language: string]: T;
}

interface UnawareLocalized<T> {
    default: T;
}

type Localized<T> = AwareLocalized<T> | UnawareLocalized<T>;

interface PdfStatement {
    type: "pdf";
    url: Localized<string>;
}

interface HtmlStatement {
    type: "html";
    html: Localized<string>;
}

type Statement = PdfStatement | HtmlStatement;

interface FileInfo {
    // mimics https://developer.mozilla.org/en-US/docs/Web/API/File
    name: string;
    type: string;
}

interface Attachment {
    title: string;
    file: FileInfo & {
        url: string;
    }
}

interface SubmissionFileField {
    type: "file";
    required: boolean;
    title: Localized<string>;
    // TODO: list of interpretations (Python 2, Python 3, etc.)
}

interface SubmissionForm {
    fields: {
        [name: string]: SubmissionFileField;
    };
}

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

export interface TaskMetadata {
    title: Localized<string>;
    statement: Statement;
    attachments: Localized<Attachment>[];
    submission_form: SubmissionForm;
    evaluation_model: EvaluationModel;
}
