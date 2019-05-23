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
import { MoreSubmissions } from './__generated__/MoreSubmissions';

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

const mainQuery = gql`
  query Main($userId: ID!, $contestId: ID!) {
    user(id: $userId) {
      displayName
    }

    contest(id: $contestId) {
      id
    }

    participation(userId: $userId, contestId: $contestId) {
      taskParticipations {
        task {
          id
          metadataJson
        }
        scores {
          key
          score
        }
        submissions(query: { last: 5 }) {
          id
          cursor
          timestamp
          scores {
            key
            score
          }
          scoredEvaluation {
            id
          }
        }
      }
    }
  }
`;

const moreSubmissionsQuery = gql`
  query MoreSubmissions($userId: ID!, $taskId: ID!, $before: ID) {
    taskParticipation(userId: $userId, taskId: $taskId) {
      submissions(query: { last: 20, before: $before }) {
        id
        cursor
        timestamp
        scores {
          key
          score
        }
        scoredEvaluation {
          id
        }
      }
    }
  }
`;

const submitQuery = gql`
  mutation Submit($taskId: ID!, $userId: ID!, $files: [SubmissionFileInput!]!) {
    submit(taskId: $taskId, userId: $userId, files: $files) {
      id
      scoredEvaluation {
        id
      }
    }
  }
`;

function metadata({ metadataJson }: { metadataJson: string }): TaskMetadata {
  return JSON.parse(metadataJson);
}

const RelativeTimeView = ({ timestamp, ...props }: { timestamp: DateTime } & React.HTMLAttributes<HTMLElement>) => (
  <abbr {...props}
    title={timestamp.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}>
    {timestamp.toRelative()}
  </abbr>
)

class LiveEvaluationView extends React.Component<{
  metadata: TaskMetadata,
  evaluation_id: string,
  live: boolean,
}, {
  done: boolean;
}> {
  reducer = new EvaluationReducer();
  state = {
    done: false,
  };

  render() {
    const { metadata, evaluation_id, live } = this.props;
    const { done } = this.state;
    const { reducer } = this;

    return (
      <Subscription fetchPolicy="network-only" subscription={evaluationEventsSubscription} variables={{ evaluation_id }} onSubscriptionData={(
        { subscriptionData: { data: { evaluation_events: { json } } } }
      ) => reducer.onEvent(JSON.parse(json))} onSubscriptionComplete={() => this.setState({ done: true })}>
        {() => (done || live) ? <EvaluationView metadata={metadata} reducer={reducer} /> : <p>Loading...</p>}
      </Subscription>
    );
  }
};

class App extends React.Component<{}, {
  userId: string
  contestId: string
  current_taskId: null | string
  submissions_modal_open: boolean
  submit_modal_open: boolean
  submission_detail_modal_open_for_id: null | string
}> {
  state = {
    userId: "site1/user1",
    contestId: "site1/contest1",
    current_taskId: null,
    submissions_modal_open: false,
    submit_modal_open: false,
    submission_detail_modal_open_for_id: null,
  }

  render() {
    const {
      userId,
      contestId,
      current_taskId,
      submissions_modal_open,
      submit_modal_open,
      submission_detail_modal_open_for_id,
    } = this.state;

    return (
      <ApolloProvider client={client}>
        <Query query={mainQuery} variables={{ userId, contestId }} fetchPolicy="cache-and-network">
          {({ loading, error, data, fetchMore, refetch }: QueryResult<Main>) => (
            <React.Fragment>
              {
                data && data.user && (({
                  user, contest, participation: {
                    taskParticipations,
                  }
                }) => (
                    <React.Fragment>
                      <nav className="nav">
                        <h1 className="contest_title"><a href="#" onClick={(e) => {
                          e.preventDefault();
                          this.setState({ current_taskId: null });
                        }} >{contest.id}</a></h1>
                        <span className="user_displayName">{user.displayName}</span>
                        <button className="logout">Logout</button>
                      </nav>
                      <div className="contest_main">
                        <nav className="contest_nav">
                          <h2>Score</h2>
                          <div className="contest_score_container">
                            <span className="contest_score_display">
                              <span className="contest_score">{
                                taskParticipations.map(
                                  p => p.scores.map(s => s.score).reduce((a, b) => a + b)
                                ).reduce((a, b) => a + b)
                              }</span>
                              {" / "}
                              <span className="contest_max_score">{
                                taskParticipations.map(
                                  p => metadata(p.task).scorables.map(s => s.max_score).reduce((a, b) => a + b)
                                ).reduce((a, b) => a + b)
                              }</span>
                            </span>
                          </div>
                          <h2>Remaining Time</h2>
                          <div className="contest_remaining_time">
                            02:49:53
                          </div>
                          <h2>Tasks</h2>
                          <ol className="contest_tasks_nav_container">
                            {taskParticipations.map(({ task, scores }, i) => (
                              <li className="task_list_item"><a href="#" onClick={(e) => {
                                e.preventDefault();
                                this.setState({ current_taskId: task.id })
                              }} className={task.id === current_taskId ? "task_link active" : "task_link"}>
                                <span className="task_short_title">{localize(metadata(task).title)}</span>
                                {(({ score, max_score }) => (
                                  <span className={`task_score_badge ${
                                    score <= 0 ? "score_zero" :
                                      score >= max_score ? "score_full" :
                                        "score_partial"
                                    }`}>
                                    <span className="task_score">{score}</span>/
                                    <span className="task_max_score">{max_score}</span>
                                  </span>
                                ))({
                                  score: scores.map(s => s.score).reduce((a, b) => a + b),
                                  max_score: metadata(task).scorables.map(s => s.max_score).reduce((a, b) => a + b),
                                })}
                              </a></li>
                            ))}
                          </ol>
                        </nav>
                        {taskParticipations.filter(({ task }) => task.id === current_taskId).map(({ task, submissions }, i) => (
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
                                    <RelativeTimeView
                                      className="task_last_submission_timestamp"
                                      timestamp={DateTime.fromISO(last_submission.timestamp)}
                                    />{" "}
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
                                              <th>Time</th>
                                              <th>Score</th>
                                            </tr>
                                          </thead>
                                          <tbody className="submission_table_body">
                                            {submissions.slice().reverse().map((submission) => (
                                              <tr>
                                                <td>
                                                  <RelativeTimeView timestamp={DateTime.fromISO(submission.timestamp)} />
                                                  <br />
                                                  <a href="#" onClick={(e) => {
                                                    e.preventDefault();
                                                    this.setState({
                                                      submission_detail_modal_open_for_id: submission.id
                                                    });
                                                  }}>
                                                    details
                                                  </a>
                                                </td>
                                                <td>
                                                  {submission.scores.map(s => s.score).reduce((a, b) => a + b)}
                                                  {" / "}
                                                  {metadata(task).scorables.map(s => s.max_score).reduce((a, b) => a + b)}
                                                </td>
                                              </tr>
                                            ))}
                                            <tr>
                                              <td colSpan={2}>
                                                <a href="#" onClick={async (e) => {
                                                  e.preventDefault();
                                                  await fetchMore({
                                                    query: moreSubmissionsQuery,
                                                    variables: {
                                                      userId,
                                                      taskId: task.id,
                                                      before: submissions[0].cursor,
                                                    },
                                                    // fetchMoreResult is typed as Main be default (bug?)
                                                    updateQuery(previousResult, { fetchMoreResult }: { fetchMoreResult: Main & MoreSubmissions }) {
                                                      return {
                                                        ...previousResult,
                                                        participation: {
                                                          ...previousResult.participation,
                                                          taskParticipations: previousResult.participation.taskParticipations.map(p => (
                                                            p.task.id === task.id ? {
                                                              ...p,
                                                              submissions: [
                                                                ...(fetchMoreResult as MoreSubmissions).taskParticipation.submissions,
                                                                ...p.submissions,
                                                              ]
                                                            } : p
                                                          )),
                                                        }
                                                      };
                                                    }
                                                  });
                                                }}>Load more...</a>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                      <div className="submissions_modal_footer">
                                        <button className="submissions_modal_close_button" onClick={() => {
                                          this.setState({ submissions_modal_open: false })
                                        }}>Close</button>
                                      </div>
                                    </ReactModal>
                                    {submissions.filter(submission => submission.id === submission_detail_modal_open_for_id).map((submission) => (
                                      <ReactModal isOpen={true} onRequestClose={() => {
                                        this.setState({ submission_detail_modal_open_for_id: null })
                                      }}>
                                        <div className="evaluation_modal_header">
                                          Evaluation
                                        </div>
                                        <div className="evaluation_modal_body">
                                          <LiveEvaluationView
                                            evaluation_id={submission.scoredEvaluation.id}
                                            metadata={metadata(task)}
                                            live={false}
                                          />
                                        </div>
                                        <div className="evaluation_modal_footer">
                                          <button onClick={() => {
                                            this.setState({ submission_detail_modal_open_for_id: null });
                                          }} className="evaluation_modal_close_button">Close</button>
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
                              <Mutation mutation={submitQuery} variables={{ taskId: task.id, userId }}>
                                {(submit: MutationFunc<Submit>, { data: submitData }) => (
                                  <div className="modal_container">
                                    {submitData && (
                                      <React.Fragment>
                                        <div className="evaluation_modal_header">
                                          Evaluation
                                        </div>
                                        <div className="evaluation_modal_body">
                                          <LiveEvaluationView
                                            evaluation_id={submitData.submit.scoredEvaluation.id}
                                            metadata={metadata(task)}
                                            live={true}
                                          />
                                        </div>
                                        <div className="evaluation_modal_footer">
                                          <button onClick={() => {
                                            this.setState({ submit_modal_open: false });
                                          }} className="evaluation_modal_close_button">Close</button>
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
