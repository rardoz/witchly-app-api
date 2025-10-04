import type { Request, Response } from 'express';
import { Client } from '../models/Client';
import {
  generateAccessToken,
  verifyClientSecret,
} from '../services/jwt.service';

interface TokenRequest {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  scope?: string;
}

interface TokenError {
  error: string;
  error_description: string;
}

/**
 * OAuth2 Token Endpoint
 * POST /oauth/token
 */
export async function tokenEndpoint(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { grant_type, client_id, client_secret, scope }: TokenRequest =
      req.body;

    // Validate required fields
    if (!grant_type || !client_id || !client_secret) {
      const error: TokenError = {
        error: 'invalid_request',
        error_description:
          'Missing required fields: grant_type, client_id, client_secret',
      };
      res.status(400).json(error);
      return;
    }

    // Only support client_credentials grant type
    if (grant_type !== 'client_credentials') {
      const error: TokenError = {
        error: 'unsupported_grant_type',
        error_description: 'Only client_credentials grant type is supported',
      };
      res.status(400).json(error);
      return;
    }

    // Find the client
    const client = await Client.findOne({
      clientId: client_id,
      isActive: true,
    });

    if (!client) {
      const error: TokenError = {
        error: 'invalid_client',
        error_description: 'Invalid client_id or client not found',
      };
      res.status(401).json(error);
      return;
    }

    // Verify client secret
    const isValidSecret = await verifyClientSecret(
      client_secret,
      client.clientSecret
    );
    if (!isValidSecret) {
      const error: TokenError = {
        error: 'invalid_client',
        error_description: 'Invalid client_secret',
      };
      res.status(401).json(error);
      return;
    }

    // Parse requested scopes (default to client's allowed scopes)
    const requestedScopes = scope ? scope.split(' ') : client.allowedScopes;

    // Check if requested scopes are allowed for this client
    const invalidScopes = requestedScopes.filter(
      (s) => !client.allowedScopes.includes(s)
    );
    if (invalidScopes.length > 0) {
      const error: TokenError = {
        error: 'invalid_scope',
        error_description: `Invalid scopes: ${invalidScopes.join(', ')}`,
      };
      res.status(400).json(error);
      return;
    }

    // Generate access token
    const tokenResponse = generateAccessToken(
      client.clientId,
      requestedScopes,
      client.tokenExpiresIn
    );

    // Update last used timestamp
    client.lastUsed = new Date();
    await client.save();

    // Return token response
    res.json(tokenResponse);
  } catch (error) {
    console.error('Token endpoint error:', error);
    const errorResponse: TokenError = {
      error: 'server_error',
      error_description: 'Internal server error',
    };
    res.status(500).json(errorResponse);
  }
}
