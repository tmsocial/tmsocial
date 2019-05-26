import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationLiveDialogComponent } from './evaluation-live-dialog.component';

describe('EvaluationLiveDialogComponent', () => {
  let component: EvaluationLiveDialogComponent;
  let fixture: ComponentFixture<EvaluationLiveDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EvaluationLiveDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluationLiveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
