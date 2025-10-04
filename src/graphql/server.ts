import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { buildSchema } from 'type-graphql';
import { ClientResolver } from './resolvers/ClientResolver';
import { UserResolver } from './resolvers/UserResolver';

export const createApolloServer = async (): Promise<ApolloServer> => {
  const schema = await buildSchema({
    resolvers: [UserResolver, ClientResolver],
    validate: false,
  });

  const server = new ApolloServer({
    schema,
    introspection: process.env.NODE_ENV !== 'production',
  });

  return server;
};
