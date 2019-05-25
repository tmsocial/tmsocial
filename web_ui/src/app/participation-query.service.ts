import { Injectable } from '@angular/core';
import { Query } from 'apollo-angular';
import gql from 'graphql-tag';
import { ParticipationQuery, ParticipationQueryVariables } from './__generated__/ParticipationQuery';

@Injectable({
  providedIn: 'root'
})
export class ParticipationQueryService extends Query<ParticipationQuery, ParticipationQueryVariables> {
  document = gql`
    query ParticipationQuery($userId: ID!, $contestId: ID!) {
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
  `;
}
