import 'core-js/modules/es.symbol.async-iterator';
import * as express from 'express';
import * as http from 'http';
import { ApolloServer } from "apollo-server-express";
import { resolvers } from './resolvers';
import { typeDefs } from './api-loader';

const apollo = new ApolloServer({
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

const app = express();
var server = http.createServer(app);

apollo.applyMiddleware({ app });
apollo.installSubscriptionHandlers(server);

app.use(express.static('../web_ui/dist'));

server.listen({ port: 4000 }, () => {
  console.log(
    '🚀 Server ready at',
    `http://localhost:4000${apollo.graphqlPath}`
  )
});
