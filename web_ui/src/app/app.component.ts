import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { AppQuery } from './__generated__/AppQuery';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private apollo: Apollo,
  ) { }

  userId = 'site1/user1';
  contestId = 'site1/contest1';
  selectedTaskParticipation: AppQuery['participation']['taskParticipations'] | null = null;

  queryRef = this.apollo.watchQuery<AppQuery>({
    query: gql`
      query AppQuery($userId: ID!, $contestId: ID!) {
        user(id: $userId) {
          id
          displayName
        }

        contest(id: $contestId) {
          id
        }

        participation(userId: $userId, contestId: $contestId) {
          taskParticipations {
            task {
              id
              metadataJson
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
              scoredEvaluation {
                id
              }
            }
          }
        }
      }
    `,
    variables: { userId: this.userId, contestId: this.contestId },
  });
}
