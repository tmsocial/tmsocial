import 'core-js/modules/es.symbol.async-iterator';
import { ApolloServer } from "apollo-server";
import { resolvers } from './resolvers';
import { typeDefs } from './api-loader';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  debug: true,
  subscriptions: {
    onConnect(connectionParams: any) {
      return { token: connectionParams.token };
    }
  },
  context: ({ req }) => {
    if (req) {
      const token = req.headers.authorization || '';
      // // try to retrieve a user with the token
      // const user = getUser(token);
      //
      console.log(`Received token: ${token}`)
      // // add the user to the context
      return { token: token, test: "ciao" };
    } else {
      return {};
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
