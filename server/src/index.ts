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

let opts = require('yargs')
  .usage('$0 [options]')
  .option('sites-dir', {
    alias: 's',
    describe: 'path to directory containing sites'
  })
  .option('data-dir', {
    alias: 'd',
    describe: 'path to directory containing data'
  })
  .option('host', {
    default: 'localhost',
    describe: 'host where to listen to'
  })
  .option('port', {
    default: '4000',
    describe: 'port where to listen to'
  })
  .help()
  .argv


server.listen({ host: opts.host, port: opts.port }, () => {
  console.log('🚀 Server ready at:');
  console.log(`http://${opts.host}:${opts.port}`);
  console.log(`GraphQL: http://${opts.host}:${opts.port}${apollo.graphqlPath}`);
});
