import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { WebSocketLink } from "apollo-link-ws";
import gql from "graphql-tag";
import * as React from "react";
import { ApolloProvider, Query, QueryResult, Subscription, SubscriptionResult } from "react-apollo";
import * as ReactDOM from "react-dom";
import { Contest } from "./__generated__/Contest";
import { EvaluationEvents } from "./__generated__/EvaluationEvents";

const client = new ApolloClient({
  link: new WebSocketLink({
    uri: "ws://localhost:4000/graphql",
  }),
  cache: new InMemoryCache(),
});

const App = () => (
  <ApolloProvider client={client}>
    <Query query={gql`
      query Contest($user_id: ID!) {
        site(id: "site1") {
          id
          default_contest {
            id
            participation_of_user(user_id: $user_id) {
              task_participations {
                task {
                  id
                }
              }
            }
          }
        }
      }
    `} variables={{ user_id: "site1/user1" }}>
      {({ loading, error, data }: QueryResult<Contest>) => (
        loading ? "Loading..." :
          error ? error.message :
            data ?
              <React.Fragment>
                <h1>{data.site.default_contest!.id}</h1>
              </React.Fragment>
              : null
      )}
    </Query>
    <Subscription subscription={gql`
      subscription EvaluationEvents {
        evaluation_events(evaluation_id: "site1/default/user1/easy1/2019-05-19T17:35:53.174Z/2019-05-19T17:35:53.175Z") {
          json
        }
      }
    `}>
      {({ loading, error, data }: SubscriptionResult<EvaluationEvents>) => (
        <pre>{data && data.evaluation_events.json}</pre>
      )}
    </Subscription>
  </ApolloProvider>
)

ReactDOM.render(<App />, document.getElementById("container") as Element);
