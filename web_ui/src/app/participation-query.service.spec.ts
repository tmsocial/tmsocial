import { TestBed } from '@angular/core/testing';

import { ParticipationQueryService } from './participation-query.service';

describe('ParticipationQueryService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ParticipationQueryService = TestBed.get(ParticipationQueryService);
    expect(service).toBeTruthy();
  });
});
