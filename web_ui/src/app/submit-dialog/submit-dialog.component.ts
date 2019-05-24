import { Component, OnInit, Input } from '@angular/core';
import { SubmissionForm, TaskMetadata, SubmissionFileField } from 'src/metadata';
import { SubmissionFile } from 'src/submission';
import { AppQuery } from '../__generated__/AppQuery';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EvaluationLiveDialogComponent } from '../evaluation-live-dialog/evaluation-live-dialog.component';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { SubmitMutation, SubmitMutationVariables } from './__generated__/SubmitMutation';
import { FetchResult } from 'apollo-link';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-submit-dialog',
  templateUrl: './submit-dialog.component.html',
  styleUrls: ['./submit-dialog.component.scss']
})
export class SubmitDialogComponent {

  constructor(
    private activeModal: NgbActiveModal,
    private modal: NgbModal,
    private apollo: Apollo,
  ) { }

  @Input()
  taskParticipation!: AppQuery['participation']['taskParticipations'][number];

  @Input()
  user!: AppQuery['user'];

  submission: Observable<FetchResult<SubmitMutation>> | null = null;

  get task() { return this.taskParticipation.task; }
  get taskMetadata(): TaskMetadata { return JSON.parse(this.task.metadataJson); }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (ev) => {
        const url = (ev.target as any).result as string;
        resolve(url.substring(url.indexOf(',') + 1));
      };

      reader.onerror = (ev) => {
        reject(ev);
      };

      reader.readAsDataURL(file);
    });
  }

  fieldTrackBy(field: SubmissionFileField) {
    return field.id;
  }


  async submit(event: Event) {
    const data = new FormData(event.target as HTMLFormElement);

    if (this.submission) {
      return;
    }

    try {
      const files = await Promise.all(this.taskMetadata.submission_form.fields.map<Promise<SubmissionFile>>(async (field, i) => ({
        field: field.id,
        type: data.get(`${field.id}.type`) as string,
        contentBase64: await this.toBase64(data.get(`${field.id}.file`) as File),
      })));

      this.submission = this.apollo.mutate<SubmitMutation, SubmitMutationVariables>({
        mutation: gql`
          mutation SubmitMutation($taskId: ID!, $userId: ID!, $files: [SubmissionFileInput!]!) {
            submit(taskId: $taskId, userId: $userId, files: $files) {
              id
              scoredEvaluation {
                id
              }
            }
          }
        `,
        variables: {
          taskId: this.task.id,
          userId: this.user.id,
          files,
        },
      });

      const result = await this.submission.toPromise();

      if (result.errors) {
        console.error(result.errors);
      }

      if (result.data) {
        const modalRef = this.modal.open(EvaluationLiveDialogComponent);
        modalRef.componentInstance.submission = result.data.submit;
        modalRef.componentInstance.taskParticipation = this.taskParticipation;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.activeModal.close();
    }
  }
}

