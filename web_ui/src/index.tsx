import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import gql from "graphql-tag";
import * as React from "react";
import { ApolloProvider, Query, QueryResult } from "react-apollo";
import * as ReactDOM from "react-dom";
import { Contest } from "./__generated__/Contest";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:4000/graphql",
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
            participation(user_id: $user_id) {
              tasks {
                id
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
  </ApolloProvider>
)

ReactDOM.render(<App />, document.getElementById("container") as Element);
