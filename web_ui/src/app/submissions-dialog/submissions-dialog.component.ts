import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AppComponent } from '../app.component';
import { EvaluationLiveDialogComponent } from '../evaluation-live-dialog/evaluation-live-dialog.component';
import { EvaluationObserverService } from '../evaluation-observer.service';
import { MoreSubmissionsQueryService } from '../more-submissions-query.service';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { TaskMainComponent } from '../task-main/task-main.component';

@Component({
  selector: 'app-submissions-dialog',
  templateUrl: './submissions-dialog.component.html',
  styleUrls: ['./submissions-dialog.component.scss']
})
export class SubmissionsDialogComponent {

  constructor(
    private modal: NgbModal,
    private evaluationObserverService: EvaluationObserverService,
    private moreSubmissionsQueryService: MoreSubmissionsQueryService,
  ) { }

  @Input()
  taskMainComponent!: TaskMainComponent;

  get submissions() {
    return this.taskMainComponent.taskParticipation.submissions.slice().reverse();
  }

  openDetail(submission: ParticipationQuery['participation']['taskParticipations'][number]['submissions'][number]) {
    const modalRef = this.modal.open(EvaluationLiveDialogComponent);
    const modal = modalRef.componentInstance as EvaluationLiveDialogComponent;

    modal.submission = submission;
    modal.taskMainComponent = this.taskMainComponent;
    modal.evaluationStateObservable = this.evaluationObserverService.observe({
      evaluationId: submission.scoredEvaluation.id,
    });
  }

  async loadMore() {
    const fetchMoreResult = await this.moreSubmissionsQueryService.fetch({
      userId: this.taskMainComponent.appComponent.userId,
      taskId: this.taskMainComponent.taskParticipation.task.id,
      before: this.submissions[0].cursor,
    }, {
        fetchPolicy: 'network-only',
      }).toPromise();

    this.queryRef.updateQuery((previousResult: ParticipationQuery) => ({
      ...previousResult,
      participation: {
        ...previousResult.participation,
        taskParticipations: previousResult.participation.taskParticipations.map(p => (
          p.task.id === this.taskParticipation.task.id ? {
            ...p,
            submissions: [
              ...fetchMoreResult.data.taskParticipation.submissions,
              ...p.submissions,
            ],
          } : p
        )),
      },
    }));
  }
}
