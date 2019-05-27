import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskMetadata } from 'src/metadata';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { AppComponent } from '../app.component';

@Component({
  selector: '.task_list_item',
  templateUrl: './task-link.component.html',
  styleUrls: ['./task-link.component.scss']
})
export class TaskLinkComponent {

  constructor() { }

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  @Input()
  appComponent!: AppComponent;

  get task() { return this.taskParticipation.task; }
  get taskMetadata(): TaskMetadata { return JSON.parse(this.task.metadataJson); }

  get scoreInfo(): ScoreInfo {
    return {
      score: this.taskParticipation.scores.map(s => s.score).reduce((a, b) => a + b, 0),
      maxScore: this.taskMetadata.scorables.map(s => s.max_score).reduce((a, b) => a + b, 0),
      precision: this.taskMetadata.scorables.map(s => s.precision || 0).reduce((a, b) => Math.max(a, b)),
    };
  }

  get active() {
    if (this.appComponent.selectedTaskParticipation === null) { return false; }
    return this.appComponent.selectedTaskParticipation.task.id === this.taskParticipation.task.id;
  }

  click() {
    this.appComponent.selectedTaskParticipation = this.taskParticipation;
  }
}
