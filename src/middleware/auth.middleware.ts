import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import {
  extractTokenFromHeader,
  hasScope,
  type JWTPayload,
  verifyAccessToken,
} from '../services/jwt.service';
import { type SessionInfo, SessionService } from '../services/session.service';
import { UnauthorizedError } from '../utils/errors';

// Extend Express Request to include client info and session info
declare global {
  namespace Express {
    interface Request {
      client?: JWTPayload;
      sessionInfo?: SessionInfo;
      userScopes?: string[];
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
 * Optional authentication middleware - supports both OAuth2 and user sessions
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers['x-session-token'] as string;
  const token = extractTokenFromHeader(authHeader);

  // Process OAuth2 token if present
  if (token) {
    const clientPayload = verifyAccessToken(token);
    if (clientPayload) {
      req.client = clientPayload;
    }
  }

  // Process session token if present (from Authorization header or X-Session-Token header)
  const sessionToken = sessionHeader || (token && !req.client ? token : null);

  if (sessionToken) {
    SessionService.validateSession(sessionToken, req, true)
      .then(async (sessionInfo) => {
        if (sessionInfo) {
          req.sessionInfo = sessionInfo;

          // Fetch user scopes
          try {
            const user = await User.findById(sessionInfo.userId);
            if (user?.allowedScopes) {
              req.userScopes = user.allowedScopes;
            }
          } catch (_error) {
            req.userScopes = [];
          }
        }
        next();
      })
      .catch(() => {
        next();
      });
  } else {
    next();
  }
}

/**
 * Enhanced GraphQL Context that includes both OAuth2 and session authentication
 */
export interface GraphQLContext {
  // OAuth2 client credentials
  client?: JWTPayload | undefined;
  isAuthenticated: boolean;
  hasScope: (scope: string) => boolean;

  // User session info
  sessionInfo?: SessionInfo | undefined;
  isUserAuthenticated: boolean;
  userId?: string | undefined;
  userScopes?: string[] | undefined;
  hasUserScope: (scope: string) => boolean;

  // Request information
  request: Request;

  // Helper to enforce combined OAuth2 + user session scopes (throws on failure)
  hasAppAdminScope: (context: GraphQLContext) => void;
  hasAppWriteScope: (context: GraphQLContext) => void;
  hasAppReadScope: (context: GraphQLContext) => void;
  hasUserReadAppReadScope: (context: GraphQLContext) => void;
  hasUserAdminWriteAppWriteScope: (context: GraphQLContext) => void;
}

export function createGraphQLContext(req: Request): GraphQLContext {
  const client = req.client;
  const sessionInfo = req.sessionInfo;
  const userScopes = req.userScopes;
  return {
    // OAuth2 context (existing)

    client: client || undefined,
    isAuthenticated: !!client,
    hasScope: (scope: string) => (client ? hasScope(client, scope) : false),

    // Session context (new)
    sessionInfo: sessionInfo || undefined,
    isUserAuthenticated: !!sessionInfo,
    userId: sessionInfo?.userId,
    userScopes: userScopes || undefined,
    hasUserScope: (scope: string) =>
      userScopes ? userScopes.includes(scope) : false,

    // Request information
    request: req,
    hasAppAdminScope: (context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.hasScope('admin')) {
        throw new UnauthorizedError('Admin access required');
      }
    },
    hasAppWriteScope: (context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.hasScope('write')) {
        throw new UnauthorizedError('Write access required');
      }
    },
    hasAppReadScope: (context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.hasScope('read')) {
        throw new UnauthorizedError('Read access required');
      }
    },
    hasUserReadAppReadScope: (context: GraphQLContext) => {
      if (
        !context.isAuthenticated ||
        !context.hasScope('read') ||
        !context.hasUserScope('read')
      ) {
        throw new UnauthorizedError('Read access required');
      }

      if (!context.isUserAuthenticated) {
        throw new UnauthorizedError('User authentication required');
      }
    },
    hasUserAdminWriteAppWriteScope: (context: GraphQLContext) => {
      if (
        !context.isAuthenticated ||
        !context.hasScope('write') ||
        !context.hasUserScope('write')
      ) {
        throw new UnauthorizedError('Write access required');
      }

      // Check for admin session scope
      if (!context.isUserAuthenticated || !context.hasUserScope('admin')) {
        throw new UnauthorizedError('Admin session access required');
      }
    },
  };
}
