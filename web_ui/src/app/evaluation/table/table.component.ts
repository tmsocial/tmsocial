import { Component, Input } from '@angular/core';
import { EvaluationReducer } from 'src/evaluation_process';
import { Column, Table } from 'src/table';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent {

  constructor() { }

  @Input()
  table!: Table;

  @Input()
  state!: EvaluationReducer;

  columnTrackBy(column: Column, index: number) {
    return index;
  }
}
