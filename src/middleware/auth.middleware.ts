import type { NextFunction, Request, Response } from 'express';
import {
  extractTokenFromHeader,
  hasScope,
  type JWTPayload,
  verifyAccessToken,
} from '../services/jwt.service';

// Extend Express Request to include client info
declare global {
  namespace Express {
    interface Request {
      client?: JWTPayload;
    }
  }
}

interface AuthError {
  error: string;
  error_description: string;
}

/**
 * Middleware to validate JWT tokens
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    const error: AuthError = {
      error: 'invalid_request',
      error_description:
        'Missing or invalid Authorization header. Use: Authorization: Bearer <token>',
    };
    res.status(401).json(error);
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    const error: AuthError = {
      error: 'invalid_token',
      error_description: 'Invalid or expired access token',
    };
    res.status(401).json(error);
    return;
  }

  // Add client info to request
  req.client = payload;
  next();
}

/**
 * Middleware to check if client has required scope
 */
export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.client) {
      const error: AuthError = {
        error: 'unauthorized',
        error_description: 'Authentication required',
      };
      res.status(401).json(error);
      return;
    }

    if (!hasScope(req.client, requiredScope)) {
      const error: AuthError = {
        error: 'insufficient_scope',
        error_description: `Required scope: ${requiredScope}`,
      };
      res.status(403).json(error);
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.client = payload;
    }
  }

  next();
}

/**
 * GraphQL Context builder that includes authentication
 */
export interface GraphQLContext {
  client?: JWTPayload | undefined;
  isAuthenticated: boolean;
  hasScope: (scope: string) => boolean;
}

export function createGraphQLContext(req: Request): GraphQLContext {
  const client = req.client;

  return {
    client: client || undefined,
    isAuthenticated: !!client,
    hasScope: (scope: string) => (client ? hasScope(client, scope) : false),
  };
}
