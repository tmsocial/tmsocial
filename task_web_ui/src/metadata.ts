import { EvaluationModel } from "./evaluation_model";

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

export interface TaskMetadata {
    title: Localized<string>;
    statement: Statement;
    attachments: Localized<Attachment>[];
    submission_form: SubmissionForm;
    evaluation_model: EvaluationModel;
}
