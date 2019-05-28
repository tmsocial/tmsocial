import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SubmissionFileField, TaskMetadata } from 'src/metadata';
import { SubmissionFile } from 'src/submission';
import { AppComponent } from '../app.component';
import { EvaluationLiveDialogComponent } from '../evaluation-live-dialog/evaluation-live-dialog.component';
import { EvaluationObserverService } from '../evaluation-observer.service';
import { SubmitMutationService } from '../submit-mutation.service';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { TaskMainComponent } from '../task-main/task-main.component';

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
  taskMainComponent!: TaskMainComponent;

  submitting = false;

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

    const files = await Promise.all(
      this.taskMainComponent.taskMetadata.submission_form.fields.map<Promise<SubmissionFile>>(async (field, i) => ({
        field: field.id,
        type: formData.get(`${field.id}.type`) as string,
        contentBase64: await this.toBase64(formData.get(`${field.id}.file`) as File),
      }))
    );

    const result = await this.submitMutationService.mutate({
      taskId: this.taskMainComponent.task.id,
      userId: this.taskMainComponent.appComponent.userId,
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
    modal.taskMainComponent = this.taskMainComponent;
    modal.evaluationStateObservable = this.evaluationObserverService.observe({
      evaluationId: submission.scoredEvaluation.id,
    });

    this.activeModal.close();
  }
}

