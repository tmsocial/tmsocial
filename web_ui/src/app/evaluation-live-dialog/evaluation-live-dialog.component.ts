import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { EvaluationReducer } from 'src/evaluation-process';
import { TaskMetadata } from 'src/metadata';
import { EvaluationSection } from 'src/section';
import { TableComponent } from '../evaluation/table/table.component';
import { ParticipationQuery } from '../__generated__/ParticipationQuery';
import { SubmitMutation } from '../__generated__/SubmitMutation';

@Component({
  selector: 'app-evaluation-live-dialog',
  templateUrl: './evaluation-live-dialog.component.html',
  styleUrls: ['./evaluation-live-dialog.component.scss']
})
export class EvaluationLiveDialogComponent {

  constructor(
    private activeModal: NgbActiveModal,
  ) { }

  @Input()
  submission!: SubmitMutation['submit'];

  @Input()
  taskParticipation!: ParticipationQuery['participation']['taskParticipations'][number];

  evaluationStateObservable!: Observable<EvaluationReducer>;

  get task() { return this.taskParticipation.task; }

  taskMetadataCache?: TaskMetadata;
  get taskMetadata(): TaskMetadata {
    if (this.taskMetadataCache === undefined) {
      this.taskMetadataCache = JSON.parse(this.task.metadataJson);
      return this.taskMetadata;
    }
    return this.taskMetadataCache;
  }

  sectionInfo: {
    [K in EvaluationSection['type']]: {
      component: any
    }
  } = {
      table: {
        component: TableComponent,
      },
      text_stream: {
        component: null,
      },
    };

  close() {
    this.activeModal.close();
  }

}
