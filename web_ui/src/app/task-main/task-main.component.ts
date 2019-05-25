import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TaskMetadata } from 'src/metadata';
import { LocalizeService } from '../localize.service';
import { SubmissionsDialogComponent } from '../submissions-dialog/submissions-dialog.component';
import { SubmitDialogComponent } from '../submit-dialog/submit-dialog.component';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';

@Component({
  selector: 'app-task-main',
  templateUrl: './task-main.component.html',
  styleUrls: ['./task-main.component.scss']
})
export class TaskMainComponent {

  constructor(
    private modal: NgbModal,
    private localize: LocalizeService,
  ) { }

  @Input()
  user!: ParticipationQuery['user'];

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  get task() { return this.taskParticipation.task; }
  get taskMetadata(): TaskMetadata { return JSON.parse(this.taskParticipation.task.metadataJson); }

  get lastSubmission() {
    const l = this.taskParticipation.submissions.length;
    return l > 0 ? this.taskParticipation.submissions[l - 1] : null;
  }

  openSubmissions() {
    const modalRef = this.modal.open(SubmissionsDialogComponent);
    modalRef.componentInstance.taskParticipation = this.taskParticipation;
    modalRef.componentInstance.user = this.user;
  }

  openSubmitDialog() {
    const modalRef = this.modal.open(SubmitDialogComponent);
    modalRef.componentInstance.taskParticipation = this.taskParticipation;
    modalRef.componentInstance.user = this.user;
  }

  get statementPdfUrl() {
    return this.taskMetadata.statement.pdf_base64 && `data:application/pdf;base64,${
      this.localize.localize(this.taskMetadata.statement.pdf_base64)
      }`;
  }
}
