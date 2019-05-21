import * as React from "react";
import { SubmissionForm, SubmissionFileField } from "./metadata";
import { localize } from "./l10n";
import { SubmissionFile } from "./submission";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();

    reader.onload = (ev) => {
      const url = (ev.target as any).result as string;
      resolve(url.substring(url.indexOf(',') + 1));
    }

    reader.onerror = (ev) => {
      reject(ev);
    }

    reader.readAsDataURL(file);
  })
}

export class SubmissionFileFieldView extends React.Component<{
  field: SubmissionFileField
}, {
  file: File | null
  want_custom_type: boolean
}> {
  state = {
    file: null as File | null, // FIXME: why is it needed?
    want_custom_type: false,
  }

  render() {
    const { field } = this.props;
    const { file, want_custom_type } = this.state;

    const compatibleTypes = field.types.filter(t => t.extensions.some(ext => file !== null && file.name.endsWith(ext)));

    const suggestedType = compatibleTypes.length === 1 && !want_custom_type ? compatibleTypes[0] : null;
    const suggestedTypeOptions = compatibleTypes.length > 1 && !want_custom_type ? compatibleTypes : null;
    const useCustomType = suggestedType === null && suggestedTypeOptions === null;

    return (
      <div className="submission_file_field">
        <label className="submission_file_label" htmlFor={`${field.id}.file`}>{localize(field.title)}</label>
        <input
          className="submission_file_input"
          id={`${field.id}.file`}
          name={`${field.id}.file`}
          type="file"
          onChange={(e) => this.setState({ file: e.target.files![0] || null })}
          required={field.required}
        />
        <label className="submission_file_choose_button" htmlFor={`${field.id}.file`}>Choose file</label>
        {file !== null && (
          <span>{file.name}</span>
        )}
        {file !== null && suggestedType && (
          <div className="submission_file_type_selector">
            Type: {localize(suggestedType.title)} (<a href="#" onClick={(e) => {
              e.preventDefault();
              this.setState({ want_custom_type: true });
            }}>change</a>)
            <input type="hidden" name={`${field.id}.type`} value={suggestedType.id} />
          </div>
        )}
        {file !== null && suggestedTypeOptions && (
          <div className="submission_file_type_selector">
            {suggestedTypeOptions.map((t, i) => (
              <label>
                <input type="radio" name={`${field.id}.type`} value={t.id} />
                {localize(t.title)}
              </label>
            ))}
            <a href="#" onClick={(e) => {
              e.preventDefault();
              this.setState({ want_custom_type: true });
            }}>more...</a>
          </div>
        )}
        {file !== null && useCustomType && (
          <div className="submission_file_type_selector">
            <select name={`${field.id}.type`}>
              {field.types.map((t, i) => (
                <option key={t.id} value={t.id}>{localize(t.title)}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }
}



export class SubmissionFormView extends React.Component<{
  form: SubmissionForm
  onSubmit: (files: SubmissionFile[]) => void
  onError?: (error: Error) => void
}, {
  submitting: boolean
}> {
  state = {
    submitting: false
  }

  render() {
    const { form, onSubmit, onError } = this.props;
    const { submitting } = this.state;
    return (
      <form className="submission_form" onSubmit={async e => {
        e.preventDefault();
        const data = new FormData(e.target as HTMLFormElement);

        if (this.state.submitting) {
          return;
        }
        this.setState({ submitting: true });

        try {
          const files = await Promise.all(form.fields.map<Promise<SubmissionFile>>(async (field, i) => ({
            field: field.id,
            type: data.get(`${field.id}.type`) as string,
            content_base64: await fileToBase64(data.get(`${field.id}.file`) as File),
          })))
          onSubmit(files);
        } catch (e) {
          console.error(e);
          onError !== undefined && onError(e);
        } finally {
          this.setState({ submitting: false });
        }
      }}>
        <div className="submission_form_body">
          {form.fields.map((field, i) => <SubmissionFileFieldView key={i} field={field} />)}
        </div>
        <div className="submission_form_footer">
          <button className="submission_form_submit" disabled={submitting} type="submit">Submit</button>
        </div>
      </form>
    );
  }
}

