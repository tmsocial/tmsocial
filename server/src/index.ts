import { ApolloServer, gql } from "apollo-server";
import { DateTime } from "luxon";

const server = new ApolloServer({
  debug: true,
  typeDefs: gql`
    type Contest {
      id: ID!
      tasks: [Task!]!

      # usable only by admins
      participants: [Participant!]!

      # protected by login
      participant(id: ID!): Participant!
    }

    type Task {
      id: ID!

      # no explicit support for localization here for simplicity
      name: String!
    }

    type Participant {
      id: ID!
      name: String!

      # one-to-one correspondence with contest.tasks
      tasks: [ParticipantTask!]!
    }

    type ParticipantTask {
      # no support for cursor-based pagination for simplicity
      # can always add pagination using arguments, e.g., submission(limit: Int, offset: Int)
      # (this is backward-compatible)
      submissions: [Submission!]!
    }

    type Submission {
      id: ID!
    }

    type Query {
      contests: [Contest!]!
      contest(id: ID!): Contest!
    }

    type Mutation {
      example(a: Int): String!
    }
  `, resolvers: {
    Query: {
      contests(parent, { }, context) {
        return [
          {
            id: "my_contest",
            tasks: [
              {
                id: "my_first_task",
                name: "My First Task",
              }
            ],
            participants: [
              {
                id: "user1",
                name: "John Smith",
                tasks: [
                  {
                    submissions: [
                      {
                        id: "submission1"
                      }
                    ]
                  }
                ],
              }
            ],
          }
        ]
      }
    },
    Mutation: {
      async example(parent, { a }) {
        console.log("Example:", a);
      }
    }
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
