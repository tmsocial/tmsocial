import { TestBed } from '@angular/core/testing';

import { LocalizeService } from './localize.service';

describe('LocalizeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LocalizeService = TestBed.get(LocalizeService);
    expect(service).toBeTruthy();
  });
});
