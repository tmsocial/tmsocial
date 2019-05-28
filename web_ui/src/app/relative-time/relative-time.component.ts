import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-relative-time',
  template: `<abbr [title]="time | date">{{ time | relativeNow }}</abbr>`,
})
export class RelativeTimeComponent {
  constructor() { }

  @Input()
  time!: string;
}
