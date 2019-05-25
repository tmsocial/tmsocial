import { TestBed } from '@angular/core/testing';

import { EvaluationObserverService } from './evaluation-observer.service';

describe('EvaluationObserverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: EvaluationObserverService = TestBed.get(EvaluationObserverService);
    expect(service).toBeTruthy();
  });
});
