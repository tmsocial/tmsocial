import { Component, OnInit, Input } from '@angular/core';
import { AppQuery } from '../__generated__/AppQuery';

@Component({
  selector: 'app-submissions-dialog',
  templateUrl: './submissions-dialog.component.html',
  styleUrls: ['./submissions-dialog.component.scss']
})
export class SubmissionsDialogComponent {

  constructor() { }

  @Input()
  taskParticipation: AppQuery['participation']['task_participations'][number];

}
