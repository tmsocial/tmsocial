import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { setContext } from "apollo-link-context";
import { WebSocketLink } from "apollo-link-ws";
import "babel-polyfill";
import gql from "graphql-tag";
import { DateTime } from 'luxon';
import * as React from "react";
import { ApolloProvider, Mutation, MutationFunc, Query, QueryResult, Subscription } from "react-apollo";
import * as ReactDOM from "react-dom";
import ReactModal from 'react-modal';
import { EvaluationReducer } from "./evaluation_process";
import { EvaluationView } from "./evaluation_view";
import { localize } from "./l10n";
import { TaskMetadata } from "./metadata";
import { SubmissionFormView } from "./submission_form";
import { Main } from "./__generated__/Main";
import { Submit } from "./__generated__/Submit";

Object.assign(ReactModal.defaultStyles.overlay, {
  backgroundColor: "rgba(42, 42, 42, 0.75)",
});

Object.assign(ReactModal.defaultStyles.content, {
  position: "relative",
  padding: undefined,
  top: undefined,
  bottom: undefined,
  left: undefined,
  right: undefined,
  margin: "3rem auto",
  maxWidth: "70%",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `${token}` : "",
    }
  }
});

// https://stackoverflow.com/questions/10406930/how-to-construct-a-websocket-uri-relative-to-the-page-uri
let graphqlProtocol;
if (window.location.protocol === "https:") {
  graphqlProtocol = "wss:";
} else {
  graphqlProtocol = "ws:";
}
const graphqlUrl = `${graphqlProtocol}//${window.location.host}${window.location.pathname}graphql`

const client = new ApolloClient({
  link: authLink.concat(new WebSocketLink({
    uri: window.location.toString() === "http://localhost:1234/" ? "ws://localhost:4000/graphql" : graphqlUrl,
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

const evaluationEventsSubscription = gql`
  subscription EvaluationEvents($evaluation_id: ID!) {
    evaluation_events(evaluation_id: $evaluation_id) {
      json
    }
  }
`

function loadEvents(evaluation_id: string) {
  return client.subscribe({
    query: evaluationEventsSubscription,
    variables: { evaluation_id },
  }).map(e => JSON.parse(e.data.evaluation_events.json));
}

const mainQuery = gql`
  query Main($user_id: ID!, $contest_id: ID!) {
    user(id: $user_id) {
      display_name
    }

    contest(id: $contest_id) {
      id
    }

    participation(user_id: $user_id, contest_id: $contest_id) {
      task_participations {
        task {
          id
          metadata_json
        }
        submissions(query: { last: 2 }) {
          id
          cursor
          timestamp
          official_evaluation {
            id
          }
        }
      }
    }
  }
`;

const moreSubmissionsQuery = gql`
  query MoreSubmissions($user_id: ID!, $task_id: ID!, $before: ID) {
    task_participation(user_id: $user_id, task_id: $task_id) {
      submissions(query: { last: 2, before: $before }) {
        id
        cursor
        timestamp
        official_evaluation {
          id
        }
      }
    }
  }
`;

const submitQuery = gql`
  mutation Submit($task_id: ID!, $user_id: ID!, $files: [SubmissionFileInput!]!) {
    submit(task_id: $task_id, user_id: $user_id, files: $files) {
      id
      official_evaluation {
        id
      }
    }
  }
`;

function metadata({ metadata_json }: { metadata_json: string }): TaskMetadata {
  return JSON.parse(metadata_json);
}

const LiveEvaluationView = ({ reducer, metadata, evaluation_id }: {
  reducer: EvaluationReducer,
  metadata: TaskMetadata,
  evaluation_id: string,
}) => (
    <Subscription subscription={evaluationEventsSubscription} variables={{ evaluation_id }} onSubscriptionData={(
      { subscriptionData: { data: { evaluation_events: { json } } } }
    ) => reducer.onEvent(JSON.parse(json))}>
      {() => <EvaluationView metadata={metadata} reducer={reducer} />}
    </Subscription>
  )

class App extends React.Component<{}, {
  user_id: string
  contest_id: string
  current_task_id: null | string
  submissions_modal_open: boolean
  submit_modal_open: boolean
  submission_detail_modal_open_for_id: null | string
}> {
  state = {
    user_id: "site1/user1",
    contest_id: "site1/contest1",
    current_task_id: null,
    submissions_modal_open: false,
    submit_modal_open: false,
    submission_detail_modal_open_for_id: null,
  }

  render() {
    const {
      user_id,
      contest_id,
      current_task_id,
      submissions_modal_open,
      submit_modal_open,
      submission_detail_modal_open_for_id,
    } = this.state;

    return (
      <ApolloProvider client={client}>
        <Query query={mainQuery} variables={{ user_id, contest_id }} fetchPolicy="cache-and-network">
          {({ loading, error, data, fetchMore, refetch }: QueryResult<Main>) => (
            <React.Fragment>
              {
                data && data.user && (({
                  user, contest, participation: {
                    task_participations,
                  }
                }) => (
                    <React.Fragment>
                      <nav className="nav">
                        <h1 className="contest_title"><a href="#" onClick={(e) => {
                          e.preventDefault();
                          this.setState({ current_task_id: null });
                        }} >{contest.id}</a></h1>
                        <span className="user_display_name">{user.display_name}</span>
                        <button className="logout">Logout</button>
                      </nav>
                      <div className="contest_main">
                        <nav className="contest_nav">
                          <h2>Score</h2>
                          <div className="contest_score_container">
                            <span className="contest_score_display">
                              <span className="contest_score">{42}</span>
                              {" / "}
                              <span className="contest_max_score">{42}</span>
                            </span>
                          </div>
                          <h2>Remaining Time</h2>
                          <div className="contest_remaining_time">
                            02:49:53
                          </div>
                          <h2>Tasks</h2>
                          <ol className="contest_tasks_nav_container">
                            {task_participations.map(({ task }, i) => (
                              <li className="task_list_item"><a href="#" onClick={(e) => {
                                e.preventDefault();
                                this.setState({ current_task_id: task.id })
                              }} className={task.id === current_task_id ? "task_link active" : "task_link"}>
                                {localize(metadata(task).title)}
                                <span className="task_badge">42/42</span>
                              </a></li>
                            ))}
                          </ol>
                        </nav>
                        {task_participations.filter(({ task }) => task.id === current_task_id).map(({ task, submissions }, i) => (
                          <main className="task_main">
                            <div className="task_header">
                              <h2 className="task_title">{localize(metadata(task).title)}</h2>
                              <div className="task_submit_container">
                                <a href="#" onClick={e => {
                                  e.preventDefault();
                                  this.setState({ submit_modal_open: true });
                                }} className="task_submit_start">Submit a solution</a>
                              </div>
                              <div className="task_last_submission_container">
                                {submissions.length > 0 && (({ last_submission }) => (
                                  <span className="task_last_submission">
                                    <span className="task_last_submission_label">Last submission: </span>
                                    <abbr className="task_last_submission_timestamp"
                                      title={DateTime.fromISO(last_submission.timestamp).toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}>
                                      {DateTime.fromISO(last_submission.timestamp).toRelative()}
                                    </abbr>{" "}
                                    (<a className="task_explore_submissions" href="#" onClick={(e) => {
                                      e.preventDefault();
                                      this.setState({ submissions_modal_open: true });
                                    }}>explore submissions</a>)
                                    <ReactModal isOpen={submissions_modal_open && submission_detail_modal_open_for_id === null} onRequestClose={() => {
                                      this.setState({ submissions_modal_open: false })
                                    }}>
                                      <div className="submissions_modal_header">
                                        Submissions
                                      </div>
                                      <div className="submissions_modal_body">
                                        <table className="submission_table">
                                          <thead className="submission_table_header">
                                            <tr>
                                              <th>Timestamp</th>
                                              <th>Score</th>
                                            </tr>
                                          </thead>
                                          <tbody className="submission_table_body">
                                            {submissions.slice().reverse().map((submission) => (
                                              <tr>
                                                <td><a href="#" onClick={(e) => {
                                                  e.preventDefault();
                                                  this.setState({
                                                    submission_detail_modal_open_for_id: submission.id
                                                  });
                                                }}>{submission.timestamp}</a></td>
                                                <td>42 / 42</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                        <a href="#" onClick={async (e) => {
                                          e.preventDefault();
                                          await fetchMore({
                                            query: moreSubmissionsQuery,
                                            variables: {
                                              user_id,
                                              task_id: task.id,
                                              before: submissions[0].cursor,
                                            },
                                            updateQuery(previousResult, { fetchMoreResult }) {
                                              return {
                                                ...previousResult,
                                                participation: {
                                                  ...previousResult.participation,
                                                  task_participations: previousResult.participation.task_participations.map(p => (
                                                    p.task.id === task.id ? {
                                                      ...p,
                                                      submissions: [
                                                        ...fetchMoreResult.task_participation.submissions,
                                                        ...p.submissions,
                                                      ]
                                                    } : p
                                                  )),
                                                }
                                              };
                                            }
                                          });
                                        }}>Load more...</a>
                                      </div>
                                    </ReactModal>
                                    {submissions.map((submission) => (
                                      <ReactModal isOpen={submission.id === submission_detail_modal_open_for_id} onRequestClose={() => {
                                        this.setState({ submission_detail_modal_open_for_id: null })
                                      }}>
                                        <Subscription subscription={evaluationEventsSubscription} variables={{
                                          evaluation_id: submission.official_evaluation.id
                                        }} onSubscriptionComplete={() => null}>
                                          {({ }, ) => (
                                            <p></p>
                                          )}
                                        </Subscription>
                                        <div className="evaluation_modal_header">
                                          Evaluation
                                        </div>
                                        <div className="evaluation_modal_body">
                                          <LiveEvaluationView
                                            evaluation_id={submission.official_evaluation.id}
                                            reducer={new EvaluationReducer()}
                                            metadata={metadata(task)}
                                          />
                                        </div>
                                      </ReactModal>
                                    ))}
                                  </span>
                                ))({
                                  last_submission: submissions[submissions.length - 1],
                                })}
                              </div>
                            </div>
                            <ReactModal isOpen={submit_modal_open} onRequestClose={() => {
                              this.setState({ submit_modal_open: false })
                            }}>
                              <Mutation mutation={submitQuery} variables={{ task_id: task.id, user_id }}>
                                {(submit: MutationFunc<Submit>, { data: submitData }) => (
                                  <div className="modal_container">
                                    {submitData && (
                                      <React.Fragment>
                                        <div className="evaluation_modal_header">
                                          Evaluation
                                        </div>
                                        <div className="evaluation_modal_body">
                                          <LiveEvaluationView
                                            evaluation_id={submitData.submit.official_evaluation.id}
                                            reducer={new EvaluationReducer()}
                                            metadata={metadata(task)} />
                                        </div>
                                      </React.Fragment>
                                    )}
                                    {!submitData &&
                                      <SubmissionFormView
                                        form={metadata(task).submission_form}
                                        onSubmit={async (files) => {
                                          await submit({ variables: { files } });
                                          await refetch();
                                        }}
                                      />
                                    }
                                  </div>
                                )}
                              </Mutation>
                            </ReactModal>
                            {((statement) => (
                              <React.Fragment>
                                {statement.pdf_base64 && <a download href={`data:application/pdf;base64,${localize(statement.pdf_base64)}`}>Download PDF</a>}
                                {statement.html && (
                                  <iframe className="task_statement_html" srcDoc={localize(statement.html)} sandbox="allow-scripts" />
                                )}
                              </React.Fragment>
                            ))(metadata(task).statement)}
                          </main>
                        ))}
                      </div>
                    </React.Fragment>
                  )
                )(data)
              }
              {loading && <p>Loading...</p>}
              {error && <p>{error.message}</p>}
            </React.Fragment>
          )}
        </Query>
      </ApolloProvider>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("container") as Element);
