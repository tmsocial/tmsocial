import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { EvaluationLiveDialogComponent } from '../evaluation-live-dialog/evaluation-live-dialog.component';
import { EvaluationObserverService } from '../evaluation-observer.service';

@Component({
  selector: 'app-submissions-dialog',
  templateUrl: './submissions-dialog.component.html',
  styleUrls: ['./submissions-dialog.component.scss']
})
export class SubmissionsDialogComponent {

  constructor(
    private modal: NgbModal,
    private evaluationObserverService: EvaluationObserverService,
  ) { }

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  openDetail(submission: ParticipationQuery['participation']['taskParticipations'][number]['submissions'][number]) {
    const modalRef = this.modal.open(EvaluationLiveDialogComponent);
    const modal = modalRef.componentInstance as EvaluationLiveDialogComponent;

    modal.submission = submission;
    modal.taskParticipation = this.taskParticipation;
    modal.evaluationStateObservable = this.evaluationObserverService.observe({
      evaluationId: submission.scoredEvaluation.id,
    });
  }

}
