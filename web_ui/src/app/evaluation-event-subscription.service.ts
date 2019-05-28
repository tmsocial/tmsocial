import { Injectable } from '@angular/core';
import { Subscription } from 'apollo-angular';
import gql from 'graphql-tag';
import { EvaluationEventSubscription, EvaluationEventSubscriptionVariables } from './__generated__/EvaluationEventSubscription';

@Injectable({
  providedIn: 'root'
})
export class EvaluationEventSubscriptionService extends Subscription<EvaluationEventSubscription, EvaluationEventSubscriptionVariables> {
  document = gql`
    subscription EvaluationEventSubscription($evaluationId: ID!) {
      evaluationEvents(evaluationId: $evaluationId) {
        json
      }
    }
  `;
}
