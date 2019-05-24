import { Component, ComponentFactory, Input } from '@angular/core';
import { Column, Table } from 'src/table';
import { NamedColumnHeaderComponent } from '../named-column-header/named-column-header.component';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent {

  constructor() { }

  @Input()
  table!: Table;

  readonly columnInfo: {
    [K in Column['type']]: {
      header: any,
    }
  } = {
      memory_usage: {
        header: NamedColumnHeaderComponent,
      },
      message: {
        header: NamedColumnHeaderComponent,
      },
      percentage: {
        header: NamedColumnHeaderComponent,
      },
      return_code: {
        header: NamedColumnHeaderComponent,
      },
      row_name: {
        header: NamedColumnHeaderComponent,
      },
      row_number: {
        header: NamedColumnHeaderComponent,
      },
      row_status: {
        header: NamedColumnHeaderComponent,
      },
      score: {
        header: NamedColumnHeaderComponent,
      },
      signal: {
        header: NamedColumnHeaderComponent,
      },
      status: {
        header: NamedColumnHeaderComponent,
      },
      time_usage: {
        header: NamedColumnHeaderComponent,
      },
    };
}
