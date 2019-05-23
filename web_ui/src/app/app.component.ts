import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { SubmissionsDialogComponent } from './submissions-dialog/submissions-dialog.component';
import { AppQuery } from './__generated__/AppQuery';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-web-ui';

  constructor(
    private apollo: Apollo,
  ) { }

  user_id = 'site1/user1';
  contest_id = 'site1/contest1';
  selectedTaskParticipation: AppQuery['participation']['task_participations'] | null = null;

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
}
