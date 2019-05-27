import { Component, OnInit, Input } from '@angular/core';
import { TaskMainComponent } from '../task-main/task-main.component';
import { SubmissionsDialogComponent } from '../submissions-dialog/submissions-dialog.component';
import { TaskScorable } from 'src/metadata';

@Component({
  selector: '.submission_row',
  templateUrl: './submission-row.component.html',
  styleUrls: ['./submission-row.component.scss']
})
export class SubmissionRowComponent {

  @Input()
  submissionDialogComponent!: SubmissionsDialogComponent;

  @Input()
  submission!: SubmissionsDialogComponent['submissions'][number];

  getScore(scorable: TaskScorable) {
    return this.submission.scores.filter(s => s.key === scorable.key)[0].score;
  }

  get scorables() {
    return this.submissionDialogComponent.taskMainComponent.taskMetadata.scorables;
  }

  get scores(): {
    scorable: TaskScorable,
    value: number,
  }[] {
    return this.scorables.map(
      scorable => ({ scorable, value: this.getScore(scorable) })
    );
  }

  get totalScoreInfo(): ScoreInfo {
    return {
      score: this.scorables.map(s => this.getScore(s)).reduce((a, b) => a + b),
      maxScore: this.scorables.map(s => s.max_score).reduce((a, b) => a + b),
      precision: this.scorables.map(s => s.precision).reduce((a, b) => Math.max(a, b)),
    };
  }

}
