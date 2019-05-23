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
  entryComponents: [SubmissionsDialogComponent],
})
export class AppModule { }
