import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskMainComponent } from './task-main.component';

describe('TaskMainComponent', () => {
  let component: TaskMainComponent;
  let fixture: ComponentFixture<TaskMainComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TaskMainComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
