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
  taskParticipation: AppQuery['participation']['taskParticipations'][number];

  @Input()
  selectedTaskParticipation: AppQuery['participation']['taskParticipations'][number];

  @Output() selectedTaskParticipationChange = new EventEmitter();

  get task() { return this.taskParticipation.task; }
  get taskMetadata() { return JSON.parse(this.taskParticipation.task.metadataJson); }

  click() {
    this.selectedTaskParticipationChange.emit(this.taskParticipation);
  }
}
