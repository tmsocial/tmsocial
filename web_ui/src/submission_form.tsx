import * as React from "react";
import { SubmissionForm } from "./metadata";
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

export const SubmissionFormView = ({ form, onSubmit }: { form: SubmissionForm, onSubmit: (files: SubmissionFile[]) => void }) => (
  <form onSubmit={e => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);

    const files = Promise.all(form.fields.map<Promise<SubmissionFile>>(async (field, i) => ({
      field: field.id,
      type: data.get(`${field.id}.type`) as string,
      content_base64: await fileToBase64(data.get(`${field.id}.file`) as File),
    })))

    files.then(files => onSubmit(files));
  }}>
    {
      form.fields.map((field, i) => (
        <div>
          <label htmlFor={`${field.id}.file`}>{localize(field.title)}</label>
          <input name={`${field.id}.file`} type="file" required={field.required} />
          <select name={`${field.id}.type`}>
            {field.types.map((t, i) => (
              <option key={t.id} label={localize(t.title)} value={t.id} />
            ))}
          </select>
        </div>
      ))
    }
    <button type="submit">Submit</button>
  </form>
)
