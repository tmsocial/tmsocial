import { TestBed } from '@angular/core/testing';

import { SubmitMutationService } from './submit-mutation.service';

describe('SubmitMutationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SubmitMutationService = TestBed.get(SubmitMutationService);
    expect(service).toBeTruthy();
  });
});
