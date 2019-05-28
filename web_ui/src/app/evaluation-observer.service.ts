import { Injectable } from '@angular/core';
import { SubscriptionResult } from 'apollo-angular';
import { debounceTime, filter, map, scan, tap, auditTime, exhaust, throttleTime, shareReplay, flatMap, concatMap } from 'rxjs/operators';
import { EvaluationEvent } from 'src/evaluation';
import { EvaluationReducer } from 'src/evaluation-process';
import { EvaluationEventSubscriptionService } from './evaluation-event-subscription.service';
import { EvaluationEventSubscriptionVariables } from './__generated__/EvaluationEventSubscription';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EvaluationObserverService {

  constructor(
    private evaluationEventSubscriptionService: EvaluationEventSubscriptionService,
  ) { }

  observe(variables: EvaluationEventSubscriptionVariables) {
    return this.evaluationEventSubscriptionService.subscribe(variables).pipe(
      map(result => result.data),
      concatMap(data => from(data === undefined ? [] : data.evaluationEvents)),
      scan((state, { json }) => {
        state.onEvent(JSON.parse(json));
        return state;
      }, EvaluationReducer.initial()),
      throttleTime(100, undefined, { trailing: true }),
      map(s => s.copy()), // make sure components notice it has changed
      shareReplay(1),
    );
  }
}
