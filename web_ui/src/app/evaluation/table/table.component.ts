import { Component, Input } from '@angular/core';
import { evaluateExpression } from 'src/app/evaluate.pipe';
import { Status } from 'src/evaluation';
import { EvaluationReducer, EvaluationState } from 'src/evaluation-process';
import { Column, Row, Table, ValueCell } from 'src/table';

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

  getStatusClass(status: Status | null) {
    return status !== null ? status.status : 'status_unknown';
  }

  getRowClasses(table: Table, row: Row, state: EvaluationState) {
    return table.columns
      .map((column, i) => ({ column, cell: row.cells[i] }))
      .filter(({ column }) => column.type === 'row_status')
      .map(({ cell }) => cell as ValueCell<Status>)
      .map(cell => `row_status ${this.getStatusClass(evaluateExpression(cell.value, state))}`);
  }

}
