import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  clientId: string;
  scopes: string[];
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export interface RefreshTokenPayload {
  clientId: string;
  scopes: string[];
  tokenType: 'refresh';
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const SALT_ROUNDS = 12;

/**
 * Generate a new client ID
 */
export function generateClientId(): string {
  return `client_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Generate a new client secret
 */
export function generateClientSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a client secret for storage
 */
export async function hashClientSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

/**
 * Verify a client secret against its hash
 */
export async function verifyClientSecret(
  secret: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

/**
 * Generate a JWT access token with optional refresh token
 */
export function generateAccessToken(
  clientId: string,
  scopes: string[] = ['read'],
  expiresIn: number = 3600,
  refreshTokenExpiresIn?: number
): TokenResponse {
  const payload: JWTPayload = {
    clientId,
    scopes,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'witchly-api',
    audience: 'witchly-clients',
  });

  const response: TokenResponse = {
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: scopes.join(' '),
  };

  // Generate refresh token if expiration time is provided
  if (refreshTokenExpiresIn) {
    const refreshPayload: RefreshTokenPayload = {
      clientId,
      scopes,
      tokenType: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, {
      expiresIn: refreshTokenExpiresIn,
      issuer: 'witchly-api',
      audience: 'witchly-clients',
    });

    response.refresh_token = refreshToken;
  }

  return response;
}

/**
 * Verify and decode a JWT token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'witchly-api',
      audience: 'witchly-clients',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('JWT verification failed:', error);
    }
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'witchly-api',
      audience: 'witchly-clients',
    }) as RefreshTokenPayload;

    // Ensure it's actually a refresh token
    if (decoded.tokenType !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Refresh token verification failed:', error);
    }
    return null;
  }
}

/**
 * Check if token has required scope
 */
export function hasScope(
  tokenPayload: JWTPayload,
  requiredScope: string
): boolean {
  if (!tokenPayload.scopes || !Array.isArray(tokenPayload.scopes)) {
    return false;
  }
  return (
    tokenPayload.scopes.includes(requiredScope) ||
    tokenPayload.scopes.includes('admin')
  );
}
