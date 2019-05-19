import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import gql from "graphql-tag";
import * as React from "react";
import { ApolloProvider, Query } from "react-apollo";
import * as ReactDOM from "react-dom";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:4000/graphql",
  }),
  cache: new InMemoryCache(),
});

const App = () => (
  <ApolloProvider client={client}>
    <Query query={gql`
      query Contest {
        site(id: "site1") {
          id
          default_contest {
            id
          }
        }
      }
    `}>
      {({ loading, error, data }) => (
        loading ? "Loading..." :
          error ? error.message :
            <React.Fragment>
              <h1>{data.site.default_contest.id}</h1>
            </React.Fragment>
      )}
    </Query>
  </ApolloProvider>
)

ReactDOM.render(<App />, document.getElementById("container") as Element);
