import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NamedColumnHeaderComponent } from './named-column-header.component';

describe('NamedColumnHeaderComponent', () => {
  let component: NamedColumnHeaderComponent;
  let fixture: ComponentFixture<NamedColumnHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NamedColumnHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NamedColumnHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
