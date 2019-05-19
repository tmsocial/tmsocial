import 'core-js/modules/es.symbol.async-iterator';
import { ApolloServer } from "apollo-server";
import { resolvers } from './resolvers';
import { typeDefs } from './api-loader';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  debug: true,
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
