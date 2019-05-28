import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FileSizeModule } from 'ngx-filesize';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EvaluatePipe } from './evaluate.pipe';
import { EvaluationLiveDialogComponent } from './evaluation-live-dialog/evaluation-live-dialog.component';
import { ScoreCellComponent } from './evaluation/score-cell/score-cell.component';
import { TableComponent } from './evaluation/table/table.component';
import { GraphQLModule } from './graphql.module';
import { LocalizePipe } from './localize.pipe';
import { RelativeNowPipe } from './relative-now.pipe';
import { RelativeTimeComponent } from './relative-time/relative-time.component';
import { SubmissionFieldComponent } from './submission-field/submission-field.component';
import { SubmissionsDialogComponent } from './submissions-dialog/submissions-dialog.component';
import { SubmitDialogComponent } from './submit-dialog/submit-dialog.component';
import { TaskLinkComponent } from './task-link/task-link.component';
import { TaskMainComponent } from './task-main/task-main.component';
import { ContestNavComponent } from './contest-nav/contest-nav.component';
import { SubmissionRowComponent } from './submission-row/submission-row.component';

@NgModule({
  declarations: [
    AppComponent,
    LocalizePipe,
    RelativeNowPipe,
    SubmissionsDialogComponent,
    RelativeTimeComponent,
    TaskMainComponent,
    TaskLinkComponent,
    SubmitDialogComponent,
    SubmissionFieldComponent,
    EvaluationLiveDialogComponent,
    TableComponent,
    ScoreCellComponent,
    EvaluatePipe,
    ContestNavComponent,
    SubmissionRowComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    GraphQLModule,
    HttpClientModule,
    NgbModule,
    FileSizeModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    SubmissionsDialogComponent,
    EvaluationLiveDialogComponent,
    SubmitDialogComponent,
  ],
})
export class AppModule { }
