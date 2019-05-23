import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ApolloQueryResult } from 'apollo-client';
import { Subscription } from 'apollo-client/util/Observable';
import gql from 'graphql-tag';
import { AppQuery } from './__generated__/AppQuery';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SubmissionsDialogComponent } from './submissions-dialog/submissions-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-web-ui';

  constructor(
    private apollo: Apollo,
    private modal: NgbModal,
  ) { }

  user_id = 'site1/user1';
  contest_id = 'site1/contest1';

  queryRef = this.apollo.watchQuery<AppQuery>({
    query: gql`
      query AppQuery($user_id: ID!, $contest_id: ID!) {
        user(id: $user_id) {
          display_name
        }

        contest(id: $contest_id) {
          id
        }

        participation(user_id: $user_id, contest_id: $contest_id) {
          task_participations {
            task {
              id
              metadata_json
            }
            scores {
              key
              score
            }
            submissions(query: { last: 5 }) {
              id
              cursor
              timestamp
              scores {
                key
                score
              }
              official_evaluation {
                id
              }
            }
          }
        }
      }
    `,
    variables: { user_id: this.user_id, contest_id: this.contest_id },
  });

  metadata(
    { metadata_json }: AppQuery['participation']['task_participations'][number]['task']
  ) {
    return JSON.parse(metadata_json);
  }

  openSubmissions(taskParticipation: AppQuery['participation']['task_participations'][number]) {
    const modalRef = this.modal.open(SubmissionsDialogComponent, {

    });

    modalRef.componentInstance.taskParticipation = taskParticipation;
  }
}
