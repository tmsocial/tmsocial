import { FieldValue, Fraction, Score, TimeUsage, MemoryUsage } from "./evaluation";

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

export interface FieldModelBase<T extends FieldValue> {
    name: string;
}

export interface ScoreViewModel extends FieldModelBase<Score> {
    type: "score";
    max_score?: number;
}

export interface PercentageViewModel extends FieldModelBase<Fraction> {
    type: "percentage";
    precision?: number;
}

export interface TimeUsageViewModel extends FieldModelBase<TimeUsage> {
    type: "time_usage";
}

export interface MemoryUsageViewModel extends FieldModelBase<MemoryUsage> {
    type: "memory_usage";
}

export interface ListModel {
    type: "list";
    items: EvaluationModel[];
}

export type FieldViewModel = ScoreViewModel | PercentageViewModel | TimeUsageViewModel | MemoryUsageViewModel;
export type EvaluationModel = FieldViewModel | ListModel;

export interface TaskMetadata {
    title: Localized<string>;
    statement: Statement;
    attachments: Localized<Attachment>[];
    submission_form: SubmissionForm;
    evaluation_model: EvaluationModel;
}
