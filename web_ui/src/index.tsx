import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { setContext } from "apollo-link-context";
import { WebSocketLink } from "apollo-link-ws";
import "babel-polyfill";
import gql from "graphql-tag";
import * as React from "react";
import { ApolloProvider, Mutation, MutationFunc, Query, QueryResult } from "react-apollo";
import * as ReactDOM from "react-dom";
import { EvaluationComponent } from "./evaluation_component";
import { SubmissionFormView } from "./submission_form";
import { Contest } from "./__generated__/Contest";
import { Submit } from "./__generated__/Submit";
import { Main } from "./__generated__/Main";

const user_id = "site1/user1";

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
      query Main($user_id: ID!) {
        user(id: $user_id) {
          display_name
          participation_in_default_contest {
            contest {
              id
            }
            task_participations {
              task {
                id
                metadata_json
              }
              submissions(query: { last: 1 }) {
                id
                timestamp
                official_evaluation {
                  id
                }
              }
            }
          }
        }
      }
    `} variables={{ user_id }}>
      {({ loading, error, data }: QueryResult<Main>) => (
        <React.Fragment>
          {
            data && data.user && (({ contest, task_participations }) => (
              <React.Fragment>
                <h1><code>{contest.id}</code></h1>
                {task_participations.map(({ task, submissions }, i) => (
                  <div>
                    <h2><code>{task.id}</code></h2>
                    <p>TODO: statement</p>
                    <Mutation mutation={gql`
                      mutation Submit($task_id: ID!, $user_id: ID!, $files: [SubmissionFileInput!]!) {
                        submit(task_id: $task_id, user_id: $user_id, files: $files) {
                          id
                          official_evaluation {
                            id
                          }
                        }
                      }
                    `} variables={{ task_id: task.id, user_id }}>
                      {(submit: MutationFunc<Submit>, { data: submitData }) => (
                        <React.Fragment>
                          <SubmissionFormView
                            form={JSON.parse(task.metadata_json).submission_form}
                            onSubmit={(files) => submit({ variables: { files } })} />
                          {submitData ? <EvaluationComponent events={loadEvents(submitData.submit.official_evaluation.id)} metadata={JSON.parse(task.metadata_json)} /> : null}
                        </React.Fragment>
                      )}
                    </Mutation>
                    <p>Latest submissions:</p>
                    {
                      submissions.map((submission) => (
                        <EvaluationComponent events={loadEvents(submission.official_evaluation.id)} metadata={JSON.parse(task.metadata_json)} />
                      ))
                    }
                  </div>
                ))}
              </React.Fragment>
            ))({
              contest: data.user.participation_in_default_contest.contest,
              task_participations: data.user.participation_in_default_contest.task_participations
            })
          }
          {loading && <p>Loading...</p>}
          {error && <p>{error.message}</p>}
        </React.Fragment>
      )}
    </Query>
  </ApolloProvider>
)

ReactDOM.render(<App />, document.getElementById("container") as Element);
