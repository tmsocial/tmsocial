import { Component, Input, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TaskMetadata } from 'src/metadata';
import { AppComponent } from '../app.component';
import { LocalizeService } from '../localize.service';
import { SubmissionsDialogComponent } from '../submissions-dialog/submissions-dialog.component';
import { SubmitDialogComponent } from '../submit-dialog/submit-dialog.component';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';

@Component({
  selector: '.task_main',
  templateUrl: './task-main.component.html',
  styleUrls: ['./task-main.component.scss']
})
export class TaskMainComponent implements OnInit {

  constructor(
    private modal: NgbModal,
    private localize: LocalizeService,
  ) { }

  @Input()
  appComponent!: AppComponent;

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  get task() { return this.taskParticipation.task; }

  taskMetadata!: TaskMetadata;

  ngOnInit() {
    this.taskMetadata = JSON.parse(this.task.metadataJson);
  }

  get lastSubmission() {
    const l = this.taskParticipation.submissions.length;
    return l > 0 ? this.taskParticipation.submissions[l - 1] : null;
  }

  openSubmissions() {
    const modalRef = this.modal.open(SubmissionsDialogComponent);
    const modal = modalRef.componentInstance as SubmissionsDialogComponent;
    modal.taskMainComponent = this;
  }

  async openSubmitDialog() {
    const modalRef = this.modal.open(SubmitDialogComponent);
    const modal = modalRef.componentInstance as SubmitDialogComponent;
    modal.taskMainComponent = this;

    await modalRef.result;

    this.appComponent.queryRef.refetch();
  }

  get statementPdfUrl() {
    return this.taskMetadata.statement.pdf_base64 && `data:application/pdf;base64,${
      this.localize.localize(this.taskMetadata.statement.pdf_base64)
      }`;
  }
}
