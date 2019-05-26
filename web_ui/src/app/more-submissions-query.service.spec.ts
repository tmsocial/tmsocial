import { TestBed } from '@angular/core/testing';

import { MoreSubmissionsQueryService } from './more-submissions-query.service';

describe('MoreSubmissionsQueryService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MoreSubmissionsQueryService = TestBed.get(MoreSubmissionsQueryService);
    expect(service).toBeTruthy();
  });
});
