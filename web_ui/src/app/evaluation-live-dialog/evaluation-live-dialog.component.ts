import { Component, Input, OnInit } from '@angular/core';
import { SubmitMutation } from '../submit-dialog/__generated__/SubmitMutation';
import { Apollo } from 'apollo-angular';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EvaluationEvent } from 'src/evaluation';
import gql from 'graphql-tag';
import { EvaluationEventsSubscription } from './__generated__/EvaluationEventsSubscription';
import { EvaluationEventsVariables } from 'src/__generated__/EvaluationEvents';
import { AppQuery } from '../__generated__/AppQuery';
import { TaskMetadata } from 'src/metadata';
import { EvaluationSection } from 'src/section';
import { TableView } from 'src/evaluation_table_view';
import { TableComponent } from '../evaluation/table/table.component';

@Component({
  selector: 'app-evaluation-live-dialog',
  templateUrl: './evaluation-live-dialog.component.html',
  styleUrls: ['./evaluation-live-dialog.component.scss']
})
export class EvaluationLiveDialogComponent implements OnInit {

  constructor(
    private apollo: Apollo,
    private activeModal: NgbActiveModal,
  ) { }

  @Input()
  submission!: SubmitMutation['submit'];

  @Input()
  taskParticipation!: AppQuery['participation']['taskParticipations'][number];

  evaluationEvents!: Observable<EvaluationEvent>;

  get task() { return this.taskParticipation.task; }
  get taskMetadata(): TaskMetadata { return JSON.parse(this.task.metadataJson); }

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
  }

  ngOnInit() {
    this.apollo.subscribe<EvaluationEventsSubscription, EvaluationEventsVariables>({
      query: gql`
        subscription EvaluationEventsSubscription($evaluationId: ID!) {
          evaluationEvents(evaluationId: $evaluationId) {
            json
          }
        }
      `,
      variables: {
        evaluationId: this.submission.scoredEvaluation.id,
      },
    }).pipe(
      map(e => e as EvaluationEventsSubscription),
      map(e => JSON.parse(e.evaluationEvents.json)),
    );
  }

  close() {
    this.activeModal.close();
  }

}
