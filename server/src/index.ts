import { ApolloServer, gql } from "apollo-server";

const contest = {
  id: "my_contest",
  title: "My Contest",
  tasks: [
    {
      id: "my_first_task",
      title: "My First Task",
    }
  ],
  participants: [
    {
      id: "user1",
      display_name: "John Smith",
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

const server = new ApolloServer({
  debug: true,
  typeDefs: gql`
    type Contest {
      id: ID!

      # no explicit support for localization here for simplicity
      title: String!

      tasks: [Task!]!

      # usable only by admins
      participants: [Participant!]!

      # protected by login
      participant(id: ID!): Participant!
    }

    type Task {
      id: ID!
      title: String!
    }

    type Participant {
      id: ID!

      # full name to show in the UI
      display_name: String!

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
        return [ contest ];
      },
      contest(parent, { id }, context) {
        return contest;
      },
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
