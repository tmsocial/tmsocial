import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SubmissionFileField, TaskMetadata } from 'src/metadata';
import { SubmissionFile } from 'src/submission';
import { AppComponent } from '../app.component';
import { EvaluationLiveDialogComponent } from '../evaluation-live-dialog/evaluation-live-dialog.component';
import { EvaluationObserverService } from '../evaluation-observer.service';
import { SubmitMutationService } from '../submit-mutation.service';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';

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
  appComponent!: AppComponent;

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

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
      userId: this.appComponent.userId,
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

