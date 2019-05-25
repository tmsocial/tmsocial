import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FetchResult } from 'apollo-link';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { filter, map, scan } from 'rxjs/operators';
import { EvaluationEvent } from 'src/evaluation';
import { EvaluationReducer } from 'src/evaluation_process';
import { SubmissionFileField, TaskMetadata } from 'src/metadata';
import { SubmissionFile } from 'src/submission';
import { EvaluationEventsVariables } from 'src/__generated__/EvaluationEvents';
import { EvaluationEventSubscriptionService } from '../evaluation-event-subscription.service';
import { EvaluationLiveDialogComponent } from '../evaluation-live-dialog/evaluation-live-dialog.component';
import { EvaluationEventsSubscription } from '../evaluation-live-dialog/__generated__/EvaluationEventsSubscription';
import { SubmitMutationService } from '../submit-mutation.service';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { EvaluationObserverService } from '../evaluation-observer.service';

@Component({
  selector: 'app-submit-dialog',
  templateUrl: './submit-dialog.component.html',
  styleUrls: ['./submit-dialog.component.scss']
})
export class SubmitDialogComponent {

  constructor(
    private activeModal: NgbActiveModal,
    private modal: NgbModal,
    private submitMutationService: SubmitMutationService,
    private evaluationObserverService: EvaluationObserverService,
  ) { }

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  @Input()
  user!: ParticipationQuery['user'];

  submitting = false;

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
    const formData = new FormData(event.target as HTMLFormElement);

    if (this.submitting) {
      return;
    }
    this.submitting = true;

    const files = await Promise.all(this.taskMetadata.submission_form.fields.map<Promise<SubmissionFile>>(async (field, i) => ({
      field: field.id,
      type: formData.get(`${field.id}.type`) as string,
      contentBase64: await this.toBase64(formData.get(`${field.id}.file`) as File),
    })));

    const result = await this.submitMutationService.mutate({
      taskId: this.task.id,
      userId: this.user.id,
      files,
    }).toPromise();

    const data = result.data;

    if (!data || result.errors) {
      throw new Error('error in submit');
    }

    const submission = data.submit;

    const modalRef = this.modal.open(EvaluationLiveDialogComponent);
    const modal = modalRef.componentInstance as EvaluationLiveDialogComponent;

    modal.submission = submission;
    modal.taskParticipation = this.taskParticipation;
    modal.evaluationStateObservable = this.evaluationObserverService.observe({
      evaluationId: submission.scoredEvaluation.id,
    });

    this.activeModal.close();
  }
}

