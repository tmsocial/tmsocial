import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { WebSocketLink } from "apollo-link-ws";
import { setContext } from "apollo-link-context";
import gql from "graphql-tag";
import * as React from "react";
import { ApolloProvider, Query, QueryResult, Subscription, SubscriptionResult } from "react-apollo";
import * as ReactDOM from "react-dom";
import { Contest } from "./__generated__/Contest";
import { EvaluationEvents } from "./__generated__/EvaluationEvents";
import { EvaluationComponent } from "./evaluation_component";

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(new WebSocketLink({
    uri: "ws://localhost:4000/graphql",
    // credentials: "same-origin",
  })),
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
            tasks {
              id
              metadata_json
            }
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
                <EvaluationComponent events={[]} metadata={JSON.parse(data.site.default_contest.tasks[0].metadata_json)} />
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
