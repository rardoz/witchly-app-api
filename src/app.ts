import 'reflect-metadata';
import 'dotenv/config';
import { HeaderMap, type HTTPGraphQLResponse } from '@apollo/server';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { connectDB, disconnectDB, forceCloseDB } from './config/database';
import { createApolloServer } from './graphql/server';
import {
  createGraphQLContext,
  optionalAuth,
} from './middleware/auth.middleware';
import { assetRoutes } from './routes/assets';

// Utility function to handle Apollo Server response parsing and status extraction
function processApolloResponse(response: HTTPGraphQLResponse): {
  body: unknown;
  statusCode: number;
} {
  let statusCode = response.status || 200;
  let responseBody: unknown = response.body;

  // Handle Apollo Server v5 streamed response format
  if (
    typeof responseBody === 'object' &&
    responseBody &&
    'kind' in responseBody &&
    (responseBody as { kind: string }).kind === 'complete' &&
    'string' in responseBody
  ) {
    try {
      const parsedBody = JSON.parse(
        (responseBody as { string: string }).string
      );
      responseBody = parsedBody;

      // Extract custom HTTP status codes from GraphQL errors
      if (parsedBody?.errors && Array.isArray(parsedBody.errors)) {
        const errorWithStatus = parsedBody.errors.find(
          (error: { extensions?: { http?: { status?: number } } }) =>
            error.extensions?.http?.status
        );
        if (errorWithStatus) {
          statusCode = errorWithStatus.extensions.http.status;
        }
      }
    } catch {
      responseBody = (responseBody as { string: string }).string;
    }
  }

  return { body: responseBody, statusCode };
}

// Initialize Express application with TypeScript support
const app = express();

// Trust proxy for IP address forwarding (for reverse proxies like nginx, cloudflare, etc.)
app.set('trust proxy', true);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/assets', assetRoutes);
// Initialize MongoDB and GraphQL
const initializeServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create Apollo Server
    const apolloServer = await createApolloServer();
    await apolloServer.start();

    // Main GraphQL endpoint (includes Auth, User, Client resolvers)
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

        // Process Apollo Server response and extract status code
        const { body: responseBody, statusCode } =
          processApolloResponse(response);

        res.status(statusCode);
        for (const [key, value] of response.headers) {
          res.setHeader(key, value);
        }

        res.json(responseBody);
      } catch (error) {
        console.error('GraphQL execution error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    console.log('GraphQL server ready at /graphql');
  } catch (error) {
    console.error('Failed to initialize server:', error);
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

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // For development, use shorter timeout
  const isDevelopment = process.env.NODE_ENV === 'development';
  const timeoutDuration = isDevelopment ? 2000 : 10000; // 2s for dev, 10s for prod

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error(
      `Graceful shutdown timeout (${timeoutDuration}ms). Forcing exit...`
    );
    if (isDevelopment) {
      // In development, force close immediately
      forceCloseDB().finally(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }, timeoutDuration);

  try {
    // Close database connections gracefully
    await disconnectDB();
    console.log('Database connections closed');

    // Clear timeout since we completed successfully
    clearTimeout(forceExitTimeout);

    // Exit process
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);

    // Force close as fallback
    try {
      await forceCloseDB();
      console.log('Database connections forcefully closed');
    } catch (forceError) {
      console.error('Error during force close:', forceError);
    }

    // Clear timeout
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

// Handle graceful shutdown signals
if (process.env.NODE_ENV !== 'test') {
  // Handle SIGTERM (docker stop, kubernetes, etc.)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle SIGUSR2 (nodemon restart signal) - just cleanup, don't restart
  process.once('SIGUSR2', async () => {
    console.log('\nNodemon restart detected - cleaning up database...');
    try {
      await disconnectDB();
      console.log('Database connections closed for restart');
    } catch (error) {
      console.error('Error during database cleanup:', error);
      try {
        await forceCloseDB();
        console.log('Database connections forcefully closed');
      } catch (forceError) {
        console.error('Error during force close:', forceError);
      }
    }
    // Let nodemon handle the restart
    process.kill(process.pid, 'SIGUSR2');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  // Handle process exit (fallback)
  process.on('exit', () => {
    console.log('Process exit - forcing database cleanup');
  });
}

// Export initialization function for tests
export { initializeServer };

export { app };
export default app;
