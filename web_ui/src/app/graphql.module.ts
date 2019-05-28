import { NgModule } from '@angular/core';
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';
import { WebSocketLink } from 'apollo-link-ws';
import { InMemoryCache } from 'apollo-cache-inmemory';

function graphqlUrl() {
  // https://stackoverflow.com/questions/10406930/how-to-construct-a-websocket-uri-relative-to-the-page-uri
  let graphqlProtocol;
  if (window.location.protocol === 'https:') {
    graphqlProtocol = 'wss:';
  } else {
    graphqlProtocol = 'ws:';
  }
  return `${graphqlProtocol}//${window.location.host}${window.location.pathname}graphql`;
}

export function createApollo() {

  return {
    link: new WebSocketLink({
      uri: window.location.toString() === 'http://localhost:4200/' ? 'ws://localhost:4000/graphql' : graphqlUrl()
    }),
    cache: new InMemoryCache(),
  };
}

@NgModule({
  exports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [],
    },
  ],
})
export class GraphQLModule { }
