import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { Mutation } from 'apollo-angular';
import { SubmitMutation, SubmitMutationVariables } from './__generated__/SubmitMutation';

@Injectable({
  providedIn: 'root'
})
export class SubmitMutationService extends Mutation<SubmitMutation, SubmitMutationVariables> {
  document = gql`
    mutation SubmitMutation($taskId: ID!, $userId: ID!, $files: [SubmissionFileInput!]!) {
      submit(taskId: $taskId, userId: $userId, files: $files) {
        id
        scoredEvaluation {
          id
        }
      }
    }
  `;
}
