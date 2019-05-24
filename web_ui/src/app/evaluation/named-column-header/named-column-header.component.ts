import { Component, Input } from '@angular/core';
import { NamedColumn } from 'src/table';

@Component({
  selector: 'app-named-column-header',
  templateUrl: './named-column-header.component.html',
  styleUrls: ['./named-column-header.component.scss']
})
export class NamedColumnHeaderComponent {

  constructor() { }

  @Input()
  column!: NamedColumn;

}
