import crypto from 'node:crypto';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { type IUserSession, UserSession } from '../models/UserSession';
import { NotFoundError, UnauthorizedError } from '../utils/errors';

export interface UserSessionPayload {
  sessionId: string;
  userId: string;
  keepMeLoggedIn: boolean;
  iat?: number;
  exp?: number;
}

export interface RequestInfo {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface SessionTokenResponse {
  sessionToken: string;
  refreshToken?: string | undefined;
  expiresIn: number;
  expiresAt: Date;
}

export interface SessionInfo {
  userId: string;
  sessionId: string;
  keepMeLoggedIn: boolean;
  lastUsedAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export namespace SessionService {
  // Constants for session management
  export const SHORT_SESSION_HOURS = 4; // Regular session: 4 hours
  export const LONG_SESSION_DAYS = 90; // Keep me logged in: 90 days
  export const MAX_SESSIONS_PER_USER = 10; // Limit concurrent sessions

  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
  const JWT_ISSUER = 'witchly-api';
  const JWT_AUDIENCE = 'witchly-users';

  /**
   * Extract user agent and IP address from Express request
   */
  export function extractRequestInfo(request: Request): RequestInfo {
    const userAgent = request.headers['user-agent'] || undefined;

    // Extract IP address with X-Forwarded-For taking priority (for proxy setups)
    let ipAddress: string | undefined;

    // Check X-Forwarded-For first (most accurate for proxied requests)
    if (request.headers['x-forwarded-for']) {
      const forwardedIps = request.headers['x-forwarded-for'] as string;
      ipAddress = forwardedIps.split(',')[0]?.trim();
    } else if (request.headers['x-real-ip']) {
      ipAddress = request.headers['x-real-ip'] as string;
    } else if (request.ip) {
      // Fall back to Express's ip property
      ipAddress = request.ip;
    } else if (request.socket && 'remoteAddress' in request.socket) {
      ipAddress = request.socket.remoteAddress;
    } else if (request.connection && 'remoteAddress' in request.connection) {
      ipAddress = request.connection.remoteAddress;
    }

    return { userAgent, ipAddress };
  }

  /**
   * Create a new user session
   */
  export async function createSession(
    userId: string,
    keepMeLoggedIn?: boolean,
    userAgent?: string,
    ipAddress?: string
  ): Promise<SessionTokenResponse>;
  export async function createSession(
    userId: string,
    keepMeLoggedIn: boolean,
    request: Request
  ): Promise<SessionTokenResponse>;
  export async function createSession(
    userId: string,
    keepMeLoggedIn: boolean = false,
    userAgentOrRequest?: string | Request,
    ipAddress?: string
  ): Promise<SessionTokenResponse> {
    let userAgent: string | undefined;
    let resolvedIpAddress: string | undefined;

    // Handle overloaded parameters
    if (
      typeof userAgentOrRequest === 'object' &&
      userAgentOrRequest &&
      'headers' in userAgentOrRequest
    ) {
      // Request object provided
      const requestInfo = extractRequestInfo(userAgentOrRequest as Request);
      userAgent = requestInfo.userAgent;
      resolvedIpAddress = requestInfo.ipAddress;
    } else {
      // Direct parameters provided
      userAgent = userAgentOrRequest as string | undefined;
      resolvedIpAddress = ipAddress;
    }

    // Clean up expired sessions for this user
    await cleanupExpiredSessions(userId);

    // Check if user has too many active sessions
    await enforceSessionLimit(userId);

    // Generate unique session token and optional refresh token
    const sessionToken = generateSecureToken();
    const refreshToken = keepMeLoggedIn ? generateSecureToken() : undefined;

    // Calculate expiration time
    const expirationHours = keepMeLoggedIn
      ? LONG_SESSION_DAYS * 24
      : SHORT_SESSION_HOURS;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Create session record
    const session = new UserSession({
      userId,
      sessionToken,
      refreshToken,
      keepMeLoggedIn,
      expiresAt,
      lastUsedAt: new Date(),
      userAgent: userAgent?.substring(0, 500), // Limit length
      ipAddress: resolvedIpAddress,
      isActive: true,
    });

    await session.save();

    // Generate JWT token containing session info
    const jwtToken = generateSessionJWT(
      session._id as string,
      userId,
      keepMeLoggedIn,
      expirationHours * 3600
    );

    return {
      sessionToken: jwtToken,
      refreshToken,
      expiresIn: expirationHours * 3600, // Return seconds
      expiresAt,
    };
  }

  /**
   * Validate a session with optional security checks
   */
  export async function validateSession(
    sessionToken: string,
    request?: Request,
    enforceSecurityChecks: boolean = false
  ): Promise<SessionInfo | null> {
    try {
      // Decode JWT to get session info
      const payload = jwt.verify(sessionToken, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as UserSessionPayload;

      // Find the session in database
      const session = await UserSession.findOne({
        _id: payload.sessionId,
        userId: payload.userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return null;
      }

      // Security validation if request provided and enforcement enabled
      if (request && enforceSecurityChecks) {
        const currentRequestInfo = extractRequestInfo(request);

        // Check for IP address changes (strict security)
        if (session.ipAddress !== currentRequestInfo?.ipAddress) {
          // Terminate the session immediately
          await terminateSession(session._id as string, session.userId);

          throw new UnauthorizedError(
            'Session terminated due to security policy violation: IP address changed'
          );
        }

        // Check for User-Agent changes (moderate security - log but allow)
        if (session.userAgent !== currentRequestInfo?.userAgent) {
          await terminateSession(session._id as string, session.userId);
          throw new UnauthorizedError(
            'Session terminated due to security policy violation: User-Agent changed'
          );
        }
      }

      // Update last used timestamp
      session.lastUsedAt = new Date();
      await session.save();

      return {
        userId: session.userId,
        sessionId: session._id as string,
        keepMeLoggedIn: session.keepMeLoggedIn,
        lastUsedAt: session.lastUsedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
      };
    } catch (error) {
      // Re-throw UnauthorizedError for security violations
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Refresh a session using refresh token with optional security validation
   */
  export async function refreshSession(
    refreshToken: string,
    currentUserId?: string
  ): Promise<SessionTokenResponse> {
    // Validate that a refresh token was provided
    if (!refreshToken || refreshToken.trim() === '') {
      throw new UnauthorizedError('Refresh token is required');
    }

    // Find the session with the exact refresh token
    const session = await UserSession.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
      keepMeLoggedIn: true, // Only extended sessions have refresh tokens
    });

    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Additional validation: ensure the session actually has a refresh token
    if (!session.refreshToken) {
      throw new UnauthorizedError(
        'Session does not support refresh functionality'
      );
    }

    // Validate that the provided refresh token exactly matches the session's refresh token
    if (session.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Refresh token does not match session');
    }

    // Critical security check: ensure the refresh token belongs to the current user
    if (currentUserId && session.userId !== currentUserId) {
      throw new UnauthorizedError(
        'Refresh token does not belong to the current user'
      );
    }

    // Ensure this is a long-term session (keepMeLoggedIn must be true for refresh)
    if (!session.keepMeLoggedIn) {
      throw new UnauthorizedError('Only long-term sessions can be refreshed');
    }

    // Generate new session token (but keep same refresh token)
    const expirationHours = LONG_SESSION_DAYS * 24;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Update session expiration
    session.expiresAt = expiresAt;
    session.lastUsedAt = new Date();
    await session.save();

    // Generate NEW JWT token with updated expiration
    const jwtToken = generateSessionJWT(
      session._id as string,
      session.userId,
      session.keepMeLoggedIn,
      expirationHours * 3600
    );

    return {
      sessionToken: jwtToken,
      refreshToken: session.refreshToken,
      expiresIn: expirationHours * 3600,
      expiresAt,
    };
  }

  /**
   * Terminate a specific session
   */
  export async function terminateSession(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const result = await UserSession.updateOne(
      { _id: sessionId, userId, isActive: true },
      { isActive: false }
    );

    if (result.matchedCount === 0) {
      throw new NotFoundError('Session not found or already terminated');
    }
  }

  /**
   * Terminate all sessions for a user
   */
  export async function terminateAllSessions(userId: string): Promise<number> {
    const result = await UserSession.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    return result.modifiedCount;
  }

  /**
   * Get all active sessions for a user
   */
  export async function getUserSessions(
    userId: string
  ): Promise<IUserSession[]> {
    return UserSession.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ lastUsedAt: -1 });
  }

  /**
   * Clean up expired sessions for a user
   */
  export async function cleanupExpiredSessions(
    userId: string
  ): Promise<number> {
    const result = await UserSession.deleteMany({
      userId,
      $or: [{ expiresAt: { $lte: new Date() } }, { isActive: false }],
    });

    return result.deletedCount;
  }

  /**
   * Enforce session limit per user
   */
  async function enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await UserSession.countDocuments({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (activeSessions >= MAX_SESSIONS_PER_USER) {
      // Remove oldest session
      const oldestSession = await UserSession.findOne({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      }).sort({ lastUsedAt: 1 });

      if (oldestSession) {
        oldestSession.isActive = false;
        await oldestSession.save();
      }
    }
  }

  /**
   * Generate a secure random token
   */
  function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate JWT token for session
   */
  function generateSessionJWT(
    sessionId: string,
    userId: string,
    keepMeLoggedIn: boolean,
    expiresIn: number
  ): string {
    const payload: UserSessionPayload = {
      sessionId,
      userId,
      keepMeLoggedIn,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  /**
   * Public getter for SHORT_SESSION_HOURS (for tests)
   */
  export const SHORT_SESSION_HOURS_VALUE = SHORT_SESSION_HOURS;

  /**
   * Public getter for LONG_SESSION_DAYS (for tests)
   */
  export const LONG_SESSION_DAYS_VALUE = LONG_SESSION_DAYS;

  /**
   * Public getter for MAX_SESSIONS_PER_USER (for tests)
   */
  export const MAX_SESSIONS_PER_USER_VALUE = MAX_SESSIONS_PER_USER;
}
