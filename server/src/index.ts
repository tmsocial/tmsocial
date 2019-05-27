import { ApolloServer } from "apollo-server-express";
import 'core-js/modules/es.symbol.async-iterator';
import * as express from 'express';
import * as http from 'http';
import { typeDefs } from './api-loader';
import { resolvers } from './resolvers';

export const config = {
  sitesDir: '',
  dataDir: '',
};

const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  debug: true,
  subscriptions: {
    onConnect(connectionParams: any) {
      return { token: connectionParams.token };
    }
  },
  formatResponse: (response: any) => {
    // https://github.com/apollographql/apollo-server/issues/1433#issuecomment-410330808
    try {
      JSON.stringify(response);
    } catch (e) {
      response.errors = `Non JSON-serializable errors: ${response.errors}`;
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

app.use(express.static('../web_ui/dist/web-ui/'));

let opts = require('yargs')
  .usage('$0 [options]')
  .option('sites-dir', {
    alias: 's',
    required: true,
    describe: 'path to directory containing sites'
  })
  .option('data-dir', {
    alias: 'd',
    required: true,
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
  .argv;

config.sitesDir = opts["sites-dir"];
config.dataDir = opts["data-dir"];

server.listen({ host: opts.host, port: opts.port }, () => {
  console.log('🚀 Server ready at:');
  console.log(`http://${opts.host}:${opts.port}`);
  console.log(`GraphQL: http://${opts.host}:${opts.port}${apollo.graphqlPath}`);
});
