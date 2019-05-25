import { Injectable } from '@angular/core';
import { SubscriptionResult } from 'apollo-angular';
import { debounceTime, filter, map, scan, tap, auditTime, exhaust, throttleTime } from 'rxjs/operators';
import { EvaluationEvent } from 'src/evaluation';
import { EvaluationReducer } from 'src/evaluation_process';
import { EvaluationEventSubscriptionService } from './evaluation-event-subscription.service';
import { EvaluationEventsSubscription } from './submit-dialog/__generated__/EvaluationEventsSubscription';
import { EvaluationEventSubscriptionVariables } from './__generated__/EvaluationEventSubscription';

@Injectable({
  providedIn: 'root'
})
export class EvaluationObserverService {

  constructor(
    private evaluationEventSubscriptionService: EvaluationEventSubscriptionService,
  ) { }

  observe(variables: EvaluationEventSubscriptionVariables) {
    return this.evaluationEventSubscriptionService.subscribe(variables).pipe(
      scan((state, result) => {
        if (result.data !== undefined) {
          state.onEvent(JSON.parse(result.data.evaluationEvents.json));
        }
        return state;
      }, EvaluationReducer.initial()),
      throttleTime(100, undefined, { trailing: true }),
      map(s => s.copy()), // make sure components notice it has changed
    );
  }
}
