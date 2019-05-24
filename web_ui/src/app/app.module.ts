import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { LocalizePipe } from './localize.pipe';
import { RelativeNowPipe } from './relative-now.pipe';
import { SubmissionsDialogComponent } from './submissions-dialog/submissions-dialog.component';
import { RelativeTimeComponent } from './relative-time/relative-time.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TaskMainComponent } from './task-main/task-main.component';
import { TaskLinkComponent } from './task-link/task-link.component';
import { SubmitDialogComponent } from './submit-dialog/submit-dialog.component';
import { SubmissionFieldComponent } from './submission-field/submission-field.component';
import { EvaluationLiveDialogComponent } from './evaluation-live-dialog/evaluation-live-dialog.component';
import { TableComponent } from './evaluation/table/table.component';
import { NamedColumnHeaderComponent } from './evaluation/named-column-header/named-column-header.component';
import { ScoreCellComponent } from './evaluation/score-cell/score-cell.component';

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
    NamedColumnHeaderComponent,
    ScoreCellComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    GraphQLModule,
    HttpClientModule,
    NgbModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    SubmissionsDialogComponent,
    EvaluationLiveDialogComponent,
    SubmitDialogComponent,
    NamedColumnHeaderComponent,
  ],
})
export class AppModule { }
