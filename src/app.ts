import 'reflect-metadata';
import 'dotenv/config';
import { HeaderMap } from '@apollo/server';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { connectDB } from './config/database';
import { createApolloServer } from './graphql/server';

// Initialize Express application with TypeScript support
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize MongoDB and GraphQL only if not in test environment
const initializeServer = async () => {
  // Skip initialization in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log(
      '🧪 Skipping MongoDB/GraphQL initialization in test environment'
    );
    return;
  }

  try {
    // Connect to MongoDB
    await connectDB();

    // Create Apollo Server
    const apolloServer = await createApolloServer();
    await apolloServer.start();

    // Simple GraphQL endpoint
    app.all('/graphql', async (req, res) => {
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
          context: async () => ({}),
        });

        res.status(response.status || 200);
        for (const [key, value] of response.headers) {
          res.setHeader(key, value);
        }
        res.send(response.body);
      } catch (error) {
        console.error('GraphQL execution error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    console.log('🚀 GraphQL server ready at /graphql');
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
};

// Initialize server
initializeServer();

// Fallback GraphQL route for test environment
if (process.env.NODE_ENV === 'test') {
  app.all('/graphql', (_req, res) => {
    res.status(200).json({
      data: { message: 'GraphQL endpoint (test mode)' },
    });
  });
}

// Example GET route (for testing)
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, Express API with GraphQL!');
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export { app };
export default app;
