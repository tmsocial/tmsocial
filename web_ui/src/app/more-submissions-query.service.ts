import { Injectable } from '@angular/core';
import { Query } from 'apollo-angular';
import gql from 'graphql-tag';
import { MoreSubmissionsQuery, MoreSubmissionsQueryVariables } from './__generated__/MoreSubmissionsQuery';

@Injectable({
  providedIn: 'root'
})
export class MoreSubmissionsQueryService extends Query<MoreSubmissionsQuery, MoreSubmissionsQueryVariables> {
  document = gql`
    query MoreSubmissionsQuery($userId: ID!, $taskId: ID!, $before: ID) {
      taskParticipation(userId: $userId, taskId: $taskId) {
        submissions(query: { last: 20, before: $before }) {
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
  `;
}
