import { Component, OnInit, Input, HostBinding, Output, EventEmitter } from '@angular/core';
import { AppQuery } from '../__generated__/AppQuery';

@Component({
  selector: 'app-task-link',
  templateUrl: './task-link.component.html',
  styleUrls: ['./task-link.component.scss']
})
export class TaskLinkComponent {

  constructor() { }

  @Input()
  taskParticipation: AppQuery['participation']['task_participations'][number];

  @Input()
  selectedTaskParticipation: AppQuery['participation']['task_participations'][number];

  @Output() selectedTaskParticipationChange = new EventEmitter();

  get task() { return this.taskParticipation.task; }
  get taskMetadata() { return JSON.parse(this.taskParticipation.task.metadata_json); }

  click() {
    this.selectedTaskParticipationChange.emit(this.taskParticipation);
  }
}
