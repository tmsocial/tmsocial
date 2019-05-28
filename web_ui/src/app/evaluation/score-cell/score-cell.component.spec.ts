import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoreCellComponent } from './score-cell.component';

describe('ScoreCellComponent', () => {
  let component: ScoreCellComponent;
  let fixture: ComponentFixture<ScoreCellComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ScoreCellComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScoreCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
