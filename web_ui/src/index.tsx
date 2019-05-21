import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { setContext } from "apollo-link-context";
import { WebSocketLink } from "apollo-link-ws";
import "babel-polyfill";
import gql from "graphql-tag";
import { DateTime } from 'luxon';
import * as React from "react";
import { ApolloProvider, Mutation, MutationFunc, Query, QueryResult } from "react-apollo";
import * as ReactDOM from "react-dom";
import ReactModal from 'react-modal';
import { EvaluationComponent } from "./evaluation_component";
import { localize } from "./l10n";
import { TaskMetadata } from "./metadata";
import { SubmissionFormView } from "./submission_form";
import { Main } from "./__generated__/Main";
import { Submit } from "./__generated__/Submit";

// ReactModal.defaultStyles.overlay = {};
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

const mainQuery = gql`
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
          submissions(query: { last: 20 }) {
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

class App extends React.Component<{}, {
  user_id: string
  current_task_id: null | string
  submissions_modal_open: boolean
  submit_modal_open: boolean
  submission_detail_modal_open_for_id: null | string
}> {
  state = {
    user_id: "site1/user1",
    current_task_id: null,
    submissions_modal_open: false,
    submit_modal_open: false,
    submission_detail_modal_open_for_id: null,
  }

  render() {
    const {
      user_id,
      current_task_id,
      submissions_modal_open,
      submit_modal_open,
      submission_detail_modal_open_for_id,
    } = this.state;

    return (
      <ApolloProvider client={client}>
        <Query query={mainQuery} variables={{ user_id }}>
          {({ loading, error, data }: QueryResult<Main>) => (
            <React.Fragment>
              {
                data && data.user && (({
                  user, user: {
                    participation_in_default_contest: {
                      contest,
                      task_participations,
                    }
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
                                            {submissions.map((submission) => (
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
                                      </div>
                                    </ReactModal>
                                    {submissions.map((submission) => (
                                      <ReactModal isOpen={submission.id === submission_detail_modal_open_for_id} onRequestClose={() => {
                                        this.setState({ submission_detail_modal_open_for_id: null })
                                      }}>
                                        <div className="evaluation_modal_header">
                                          Evaluation
                                        </div>
                                        <div className="evaluation_modal_body">
                                          <EvaluationComponent events={loadEvents(submission.official_evaluation.id)} metadata={metadata(task)} />
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
                                          <EvaluationComponent
                                            events={loadEvents(submitData.submit.official_evaluation.id)}
                                            metadata={metadata(task)} />
                                        </div>
                                      </React.Fragment>
                                    )}
                                    {!submitData &&
                                      <SubmissionFormView
                                        form={metadata(task).submission_form}
                                        onSubmit={(files) => submit({ variables: { files } })}
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
