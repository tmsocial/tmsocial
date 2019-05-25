import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { Subscription } from 'apollo-angular';
import { EvaluationEventSubscription, EvaluationEventSubscriptionVariables } from './__generated__/EvaluationEventSubscription';
import { EvaluationEventsVariables } from 'src/__generated__/EvaluationEvents';

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
