import { EvaluationSection } from "./section";
import { Localized } from "./l10n";

export interface Statement {
    pdf_base64?: Localized<string>;
    html?: Localized<string>;
}

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
