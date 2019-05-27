import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContestNavComponent } from './contest-nav.component';

describe('ContestNavComponent', () => {
  let component: ContestNavComponent;
  let fixture: ComponentFixture<ContestNavComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContestNavComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContestNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
