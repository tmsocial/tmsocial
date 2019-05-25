import { Component } from '@angular/core';
import { ParticipationQueryService } from './participation-query.service';
import { ParticipationQuery } from './__generated__/ParticipationQuery';
import { NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: '#app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private participationQueryService: ParticipationQueryService,
    modalConfig: NgbModalConfig,
  ) {
    Object.assign(modalConfig, {
      size: 'lg',
    });
  }

  userId = 'site1/user1';
  contestId = 'site1/contest1';
  selectedTaskParticipation: ParticipationQuery['participation']['taskParticipations'] | null = null;

  queryRef = this.participationQueryService.watch({
    userId: this.userId,
    contestId: this.contestId,
  }, {
    pollInterval: 10000,
  });
}
