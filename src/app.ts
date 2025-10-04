import 'reflect-metadata';
import 'dotenv/config';
import { HeaderMap } from '@apollo/server';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { connectDB } from './config/database';
import { tokenEndpoint } from './controllers/auth.controller';
import { createApolloServer } from './graphql/server';
import {
  createGraphQLContext,
  optionalAuth,
} from './middleware/auth.middleware';

// Initialize Express application with TypeScript support
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// OAuth2 Token Endpoint
app.post('/oauth/token', tokenEndpoint);

// Initialize MongoDB and GraphQL
const initializeServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create Apollo Server
    const apolloServer = await createApolloServer();
    await apolloServer.start();

    // Simple GraphQL endpoint
    app.all('/graphql', optionalAuth, async (req, res) => {
      try {
        // Create proper HeaderMap
        const headerMap = new HeaderMap();
        Object.entries(req.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headerMap.set(key, value);
          } else if (Array.isArray(value)) {
            headerMap.set(key, value[0] || '');
          }
        });

        // Ensure search is always a string
        const search = req.url?.includes('?')
          ? req.url.split('?')[1] || ''
          : '';

        const response = await apolloServer.executeHTTPGraphQLRequest({
          httpGraphQLRequest: {
            method: req.method,
            headers: headerMap,
            search,
            body: req.body,
          },
          context: async () => createGraphQLContext(req),
        });

        res.status(response.status || 200);
        for (const [key, value] of response.headers) {
          res.setHeader(key, value);
        }

        // Handle response body - parse JSON if it's a string
        let responseBody: unknown = response.body;
        if (
          typeof responseBody === 'object' &&
          responseBody &&
          'kind' in responseBody &&
          (responseBody as { kind: string }).kind === 'complete' &&
          'string' in responseBody
        ) {
          try {
            responseBody = JSON.parse(
              (responseBody as { string: string }).string
            );
          } catch {
            responseBody = (responseBody as { string: string }).string;
          }
        }

        res.json(responseBody);
      } catch (error) {
        console.error('GraphQL execution error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    console.log('🚀 GraphQL server ready at /graphql');
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Initialize server only if not in test environment or if explicitly requested
if (process.env.NODE_ENV !== 'test') {
  initializeServer();
}

// Example GET route (for testing)
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, Express API with GraphQL!');
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export initialization function for tests
export { initializeServer };

export { app };
export default app;
