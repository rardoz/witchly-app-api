import { Arg, Mutation, Resolver } from 'type-graphql';
import { Client } from '../../models/Client';
import {
  generateAccessToken,
  verifyClientSecret,
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
    return {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope,
    };
  }
}
