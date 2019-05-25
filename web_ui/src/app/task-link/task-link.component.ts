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

  get scoreInfo(): ScoreInfo {
    return {
      score: this.taskParticipation.scores.map(s => s.score).reduce((a, b) => a + b, 0),
      maxScore: this.taskMetadata.scorables.map(s => s.max_score).reduce((a, b) => a + b, 0),
      precision: this.taskMetadata.scorables.map(s => s.precision || 0).reduce((a, b) => Math.max(a, b)),
    };
  }

  click() {
    this.selectedTaskParticipationChange.emit(this.taskParticipation);
  }
}
