import { Arg, Mutation, Resolver } from 'type-graphql';
import { Client } from '../../models/Client';
import {
  generateAccessToken,
  verifyClientSecret,
  verifyRefreshToken,
} from '../../services/jwt.service';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import {
  parseAndValidateScopes,
  validateScopeSubset,
} from '../../utils/scopes';
import { AuthenticateResponse } from '../types/Auth';

@Resolver()
export class AuthResolver {
  @Mutation(() => AuthenticateResponse)
  async authenticate(
    @Arg('grant_type') grant_type: string,
    @Arg('client_id') client_id: string,
    @Arg('client_secret') client_secret: string,
    @Arg('scope') scope: string
  ): Promise<AuthenticateResponse> {
    // Validate required fields
    if (!grant_type || !client_id || !client_secret || !scope) {
      throw new ValidationError(
        'Missing required fields: grant_type, client_id, client_secret, scope'
      );
    }

    // Only support client_credentials grant type
    if (grant_type !== 'client_credentials') {
      throw new ValidationError(
        'Only client_credentials grant type is supported'
      );
    }

    // Find the client
    const client = await Client.findOne({
      clientId: client_id,
      isActive: true,
    });

    if (!client) {
      throw new UnauthorizedError('Invalid client_id or client not found');
    }

    // Verify client secret
    const isValidSecret = await verifyClientSecret(
      client_secret,
      client.clientSecret
    );
    if (!isValidSecret) {
      throw new UnauthorizedError('Invalid client_secret');
    }

    // Parse and validate requested scopes (now required)
    let requestedScopes: string[];

    try {
      // Parse and validate the scope string format and validity
      requestedScopes = parseAndValidateScopes(scope);
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Invalid scope format'
      );
    }

    // Check if requested scopes are allowed for this client
    const invalidScopes = validateScopeSubset(
      requestedScopes,
      client.allowedScopes
    );
    if (invalidScopes.length > 0) {
      throw new ValidationError(
        `Client not authorized for scopes: ${invalidScopes.join(', ')}`
      );
    }

    // Generate access token with refresh token if supported
    const tokenResponse = generateAccessToken(
      client.clientId,
      requestedScopes,
      client.tokenExpiresIn,
      client.supportsRefreshToken ? client.refreshTokenExpiresIn : undefined
    );

    // Update last used timestamp
    client.lastUsed = new Date();
    await client.save();

    // Return token response
    const response: AuthenticateResponse = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope,
    };

    // Only add refresh_token if it exists
    if (tokenResponse.refresh_token) {
      response.refresh_token = tokenResponse.refresh_token;
    }

    return response;
  }

  @Mutation(() => AuthenticateResponse)
  async refreshToken(
    @Arg('grant_type') grant_type: string,
    @Arg('refresh_token') refresh_token: string,
    @Arg('client_id') client_id: string,
    @Arg('client_secret') client_secret: string
  ): Promise<AuthenticateResponse> {
    // Validate required fields
    if (!grant_type || !refresh_token || !client_id || !client_secret) {
      throw new ValidationError(
        'Missing required fields: grant_type, refresh_token, client_id, client_secret'
      );
    }

    // Only support refresh_token grant type
    if (grant_type !== 'refresh_token') {
      throw new ValidationError(
        'Only refresh_token grant type is supported for this endpoint'
      );
    }

    // Verify refresh token
    const refreshPayload = verifyRefreshToken(refresh_token);
    if (!refreshPayload) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Find the client
    const client = await Client.findOne({
      clientId: client_id,
      isActive: true,
    });

    if (!client) {
      throw new UnauthorizedError('Invalid client_id or client not found');
    }

    // Verify client secret
    const isValidSecret = await verifyClientSecret(
      client_secret,
      client.clientSecret
    );
    if (!isValidSecret) {
      throw new UnauthorizedError('Invalid client_secret');
    }

    // Verify the refresh token belongs to this client
    if (refreshPayload.clientId !== client_id) {
      throw new UnauthorizedError(
        'Refresh token does not belong to this client'
      );
    }

    // Verify client still supports refresh tokens
    if (!client.supportsRefreshToken) {
      throw new UnauthorizedError('Client no longer supports refresh tokens');
    }

    // Generate new access token with the same scopes as the refresh token
    const tokenResponse = generateAccessToken(
      client.clientId,
      refreshPayload.scopes,
      client.tokenExpiresIn,
      client.refreshTokenExpiresIn
    );

    // Update last used timestamp
    client.lastUsed = new Date();
    await client.save();

    // Return new token response
    const response: AuthenticateResponse = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope,
    };

    // Only add refresh_token if it exists
    if (tokenResponse.refresh_token) {
      response.refresh_token = tokenResponse.refresh_token;
    }

    return response;
  }
}
