import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { WebSocketLink } from "apollo-link-ws";
import { setContext } from "apollo-link-context";
import gql from "graphql-tag";
import * as React from "react";
import { ApolloProvider, Query, QueryResult, Subscription, SubscriptionResult, Mutation, MutationFunc } from "react-apollo";
import * as ReactDOM from "react-dom";
import { Contest } from "./__generated__/Contest";
import { EvaluationEvents } from "./__generated__/EvaluationEvents";
import { EvaluationComponent } from "./evaluation_component";
import "babel-polyfill";
import { Submit } from "./__generated__/Submit";

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
    options: {
      connectionParams: () => {
        const token = localStorage.getItem('token');
        return {
          token: token ? `${token}` : "",
        }
      }
    }
    // credentials: "same-origin",
  })),
  cache: new InMemoryCache(),
});

function loadEvents(evaluation_id: string) {
  return client.subscribe({
    query: gql`
      subscription EvaluationEvents($evaluation_id: ID!) {
        evaluation_events(evaluation_id: $evaluation_id) {
          json
        }
      }
    `,
    variables: { evaluation_id },
  }).map(e => JSON.parse(e.data.evaluation_events.json));
}

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
                <Mutation mutation={gql`
                    mutation Submit {
                      submit(task_id: "site1/default/easy1", user_id: "site1/user1", files: [
                        {
                          field: "solution"
                          type: "cpp"
                          content_base64: "I2luY2x1ZGUgPGNzdGRpbz4KaW50IG1haW4oKSB7CiNpZmRlZiBFVkFMCiAgICBmcmVvcGVuKCJpbnB1dC50eHQiLCAiciIsIHN0ZGluKTsKICAgIGZyZW9wZW4oIm91dHB1dC50eHQiLCAidyIsIHN0ZG91dCk7CiNlbmRpZgogICAgaW50IE4sIG1heDsKICAgIHNjYW5mKCIlZCIsICZOKTsKICAgIGZvciAoaW50IGk9MDsgaTxOOyBpKyspIHsKICAgICAgICBpbnQgeDsKICAgICAgICBzY2FuZigiJWQiLCAmeCk7CiAgICAgICAgaWYgKGkgPT0gMCB8fCB4ID4gbWF4KQogICAgICAgICAgICBtYXggPSB4OwogICAgfQogICAgcHJpbnRmKCIlZFxuIiwgbWF4KTsKfQo="
                        }
                      ]) {
                        id
                        official_evaluation {
                          id
                        }
                      }
                    }
                  `}>
                  {(mutate: MutationFunc<Submit>, { data: submitData }) => (
                    <div>
                      {submitData ? <EvaluationComponent events={loadEvents(submitData.submit.official_evaluation.id)} metadata={JSON.parse(data.site.default_contest.tasks[0].metadata_json)} /> : null}
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          mutate();
                        }}
                      >
                        <button type="submit">Submit</button>
                      </form>
                    </div>
                  )
                  }
                </Mutation>
              </React.Fragment>
              : null
      )}
    </Query>
  </ApolloProvider>
)

ReactDOM.render(<App />, document.getElementById("container") as Element);
