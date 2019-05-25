import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskMetadata } from 'src/metadata';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';

@Component({
  selector: 'app-task-link',
  templateUrl: './task-link.component.html',
  styleUrls: ['./task-link.component.scss']
})
export class TaskLinkComponent {

  constructor() { }

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  @Input()
  selectedTaskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  @Output() selectedTaskParticipationChange = new EventEmitter();

  get task() { return this.taskParticipation.task; }
  get taskMetadata(): TaskMetadata { return JSON.parse(this.task.metadataJson); }

  click() {
    this.selectedTaskParticipationChange.emit(this.taskParticipation);
  }
}
