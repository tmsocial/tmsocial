import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-web-ui';


  constructor(private apollo: Apollo) { }

  queryRef = this.apollo.watchQuery({
    query: gql`
      query AppQuery {
        site(id: "site1") {
          id
        }
      }
    `,
  });

  dataJson: string;

  subscription = this.queryRef.valueChanges.subscribe(({ data, loading }) => {
    this.dataJson = JSON.stringify(data);
  });
}
