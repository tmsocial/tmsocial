import { Component, OnInit, Input } from '@angular/core';
import { AppComponent } from '../app.component';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { TaskMetadata } from 'src/metadata';

@Component({
  selector: '.contest_nav',
  templateUrl: './contest-nav.component.html',
  styleUrls: ['./contest-nav.component.scss']
})
export class ContestNavComponent {

  constructor() { }

  @Input()
  appComponent!: AppComponent;

  @Input()
  participation!: ParticipationQuery['participation'];

  get scoreInfo(): ScoreInfo {
    return {
      score: this.participation.taskParticipations.map(p => p.scores.map(s => s.score).reduce((a, b) => a + b)).reduce((a, b) => a + b),
      maxScore: this.participation.taskParticipations.map(
        p => (JSON.parse(p.task.metadataJson) as TaskMetadata).scorables.map(s => s.max_score).reduce((a, b) => a + b)
      ).reduce((a, b) => a + b),
      precision: this.participation.taskParticipations.map(
        p => (JSON.parse(p.task.metadataJson) as TaskMetadata).scorables.map(s => s.precision).reduce((a, b) => Math.max(a, b))
      ).reduce((a, b) => Math.max(a, b)),
    };
  }
}
