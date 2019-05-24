import { Component, Input, OnInit } from '@angular/core';
import { SubmitMutation } from '../submit-dialog/__generated__/SubmitMutation';
import { Apollo } from 'apollo-angular';

@Component({
  selector: 'app-submission-dialog',
  templateUrl: './submission-dialog.component.html',
  styleUrls: ['./submission-dialog.component.scss']
})
export class SubmissionDialogComponent implements OnInit {

  constructor(
    private apollo: Apollo,
  ) { }

  @Input()
  submission!: SubmitMutation['submit'];

  ngOnInit() {
  }

}
