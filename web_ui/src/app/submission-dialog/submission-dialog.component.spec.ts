import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionDialogComponent } from './submission-dialog.component';

describe('SubmissionDialogComponent', () => {
  let component: SubmissionDialogComponent;
  let fixture: ComponentFixture<SubmissionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubmissionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmissionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
