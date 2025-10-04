import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { type GraphQLFormattedError } from 'graphql';
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
    formatError: (formattedError: GraphQLFormattedError, error: unknown) => {
      // Log the error for debugging
      if (process.env.NODE_ENV !== 'test') {
        console.error('GraphQL Error:', formattedError);
        console.error('Original Error:', error);
      }

      // Return the formatted error preserving all required fields
      return formattedError;
    },
  });

  return server;
};
