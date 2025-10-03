import express, { type Request, type Response } from 'express';

// Initialize Express application with TypeScript support
const app = express();

// Small change to test the setup

// Middleware to parse JSON requests
app.use(express.json());

// Example GET route
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, Express API!');
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

export { app };
export default app;
