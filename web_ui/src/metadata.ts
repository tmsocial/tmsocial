import { EvaluationSection } from "./section";

export interface PdfStatement {
    type: "pdf";
    url: Localized<string>;
}

export interface HtmlStatement {
    type: "html";
    html: Localized<string>;
}

export type Statement = PdfStatement | HtmlStatement;

export interface FileInfo {
    // mimics https://developer.mozilla.org/en-US/docs/Web/API/File
    name: string;
    type: string;
}

export interface Attachment {
    title: string;
    file: FileInfo & {
        url: string;
    }
}

export interface SubmissionFileType {
    id: string;
    title: Localized<string>;
    extensions: string[];
}

export interface SubmissionFileField {
    id: string;
    required: boolean;
    types: SubmissionFileType[];
    title: Localized<string>;
}

export interface SubmissionForm {
    fields: SubmissionFileField[];
}

export interface TaskMetadata {
    title: Localized<string>;
    statement: Statement;
    attachments: Localized<Attachment>[];
    submission_form: SubmissionForm;
    evaluation_sections: EvaluationSection[];
}
