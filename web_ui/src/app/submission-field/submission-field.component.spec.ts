import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionFieldComponent } from './submission-field.component';

describe('SubmissionFieldComponent', () => {
  let component: SubmissionFieldComponent;
  let fixture: ComponentFixture<SubmissionFieldComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubmissionFieldComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmissionFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
