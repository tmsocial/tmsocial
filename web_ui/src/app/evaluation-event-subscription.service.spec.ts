import { TestBed } from '@angular/core/testing';

import { EvaluationEventSubscriptionService } from './evaluation-event-subscription.service';

describe('EvaluationEventSubscriptionService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: EvaluationEventSubscriptionService = TestBed.get(EvaluationEventSubscriptionService);
    expect(service).toBeTruthy();
  });
});
