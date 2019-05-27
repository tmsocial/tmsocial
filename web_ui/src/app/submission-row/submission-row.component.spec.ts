import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionRowComponent } from './submission-row.component';

describe('SubmissionRowComponent', () => {
  let component: SubmissionRowComponent;
  let fixture: ComponentFixture<SubmissionRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubmissionRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmissionRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
