import 'reflect-metadata';
import {
  ApolloServer,
  type ApolloServerPlugin,
  type BaseContext,
} from '@apollo/server';
import { type GraphQLFormattedError } from 'graphql';
import { buildSchema } from 'type-graphql';
import { AuthResolver } from './resolvers/AuthResolver';
import { ClientResolver } from './resolvers/ClientResolver';
import { UserResolver } from './resolvers/UserResolver';

// Comprehensive plugin to handle Apollo Server v5 response processing and HTTP status codes
const responseProcessingPlugin: ApolloServerPlugin<BaseContext> = {
  async requestDidStart() {
    return {
      async willSendResponse(requestContext) {
        const { response } = requestContext;

        // Handle Apollo Server v5 streamed response format and custom HTTP status codes
        if (response.body && typeof response.body === 'object') {
          let parsedResult: unknown = null;

          // Case 1: Streamed response format { kind: "complete", string: "..." }
          if ('kind' in response.body && 'string' in response.body) {
            const streamedBody = response.body as {
              kind: string;
              string: string;
            };
            if (streamedBody.kind === 'complete') {
              try {
                parsedResult = JSON.parse(streamedBody.string);

                // Transform to single result format for better compatibility
                (response.body as unknown) = {
                  kind: 'single',
                  singleResult: parsedResult,
                };
              } catch (error) {
                console.warn(
                  'Failed to parse Apollo Server streamed response:',
                  error
                );
              }
            }
          }

          // Case 2: Already in single result format
          else if ('kind' in response.body && 'singleResult' in response.body) {
            const singleBody = response.body as {
              kind: string;
              singleResult: unknown;
            };
            if (singleBody.kind === 'single') {
              parsedResult = singleBody.singleResult;
            }
          }

          // Extract custom HTTP status codes from GraphQL errors
          if (
            parsedResult &&
            typeof parsedResult === 'object' &&
            'errors' in parsedResult
          ) {
            const result = parsedResult as {
              errors?: Array<{ extensions?: { http?: { status?: number } } }>;
            };
            if (result.errors && Array.isArray(result.errors)) {
              const errorWithStatus = result.errors.find((error) => {
                return (
                  error.extensions?.http?.status &&
                  typeof error.extensions.http.status === 'number'
                );
              });

              if (errorWithStatus?.extensions?.http?.status) {
                response.http.status = errorWithStatus.extensions.http.status;
              }
            }
          }
        }
      },
    };
  },
};

export const createApolloServer = async (): Promise<ApolloServer> => {
  const schema = await buildSchema({
    resolvers: [UserResolver, ClientResolver, AuthResolver],
    validate: false,
  });

  const server = new ApolloServer({
    schema,
    introspection: process.env.NODE_ENV !== 'production',
    plugins: [responseProcessingPlugin],
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
