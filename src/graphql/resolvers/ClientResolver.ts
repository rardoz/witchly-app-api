import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import type { GraphQLContext } from '../../middleware/auth.middleware';
import { Client } from '../../models/Client';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../../services/jwt.service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { validateClientScopes } from '../../utils/scopes';
import {
  ClientCredentials,
  ClientType,
  CreateClientInput,
  UpdateClientInput,
} from '../types/ClientType';

@Resolver(() => ClientType)
export class ClientResolver {
  @Query(() => [ClientType])
  async clients(@Ctx() context: GraphQLContext): Promise<ClientType[]> {
    context.hasAppAdminScope(context);

    const clients = await Client.find({}).sort({ createdAt: -1 });
    return clients.map((client) => ({
      id: String(client._id),
      clientId: client.clientId,
      name: client.name,
      description: client.description ?? undefined,
      isActive: client.isActive,
      allowedScopes: client.allowedScopes,
      tokenExpiresIn: client.tokenExpiresIn,
      lastUsed: client.lastUsed ?? undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }));
  }

  @Query(() => ClientType, { nullable: true })
  async client(
    @Arg('clientId') clientId: string,
    @Ctx() context: GraphQLContext
  ): Promise<ClientType | null> {
    // Allow clients to view their own info, or admins to view any client
    context.hasAppReadScope(context);
    const isOwnClient = context.client?.clientId === clientId;

    if (!isOwnClient && !context.hasScope('admin')) {
      throw new ForbiddenError('Can only view own client info');
    }

    const client = await Client.findOne({ clientId });
    if (!client) {
      return null;
    }

    return {
      id: String(client._id),
      clientId: client.clientId,
      name: client.name,
      description: client.description ?? undefined,
      isActive: client.isActive,
      allowedScopes: client.allowedScopes,
      tokenExpiresIn: client.tokenExpiresIn,
      lastUsed: client.lastUsed ?? undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  @Mutation(() => ClientCredentials)
  async createClient(
    @Arg('input') input: CreateClientInput,
    @Ctx() context: GraphQLContext
  ): Promise<ClientCredentials> {
    // Only allow authenticated clients with admin scope
    context.hasAppAdminScope(context);
    // Validate scopes
    let validatedScopes: string[];
    try {
      validatedScopes = validateClientScopes(input.allowedScopes);
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Invalid scopes provided'
      );
    }

    // Generate credentials
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const hashedSecret = await hashClientSecret(clientSecret);

    // Create client
    const client = new Client({
      clientId,
      clientSecret: hashedSecret,
      name: input.name,
      description: input.description,
      allowedScopes: validatedScopes,
      tokenExpiresIn: input.tokenExpiresIn,
    });

    await client.save();

    // Return the plain text secret (only time it's shown)
    return {
      clientId,
      clientSecret,
    };
  }

  @Mutation(() => ClientType)
  async updateClient(
    @Arg('clientId') clientId: string,
    @Arg('input') input: UpdateClientInput,
    @Ctx() context: GraphQLContext
  ): Promise<ClientType> {
    context.hasAppAdminScope(context);

    const client = await Client.findOne({ clientId });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // Update fields
    if (input.name !== undefined) client.name = input.name;
    if (input.description !== undefined) client.description = input.description;
    if (input.allowedScopes !== undefined) {
      // Validate scopes before updating
      try {
        client.allowedScopes = validateClientScopes(input.allowedScopes);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid scopes provided'
        );
      }
    }
    if (input.tokenExpiresIn !== undefined)
      client.tokenExpiresIn = input.tokenExpiresIn;
    if (input.isActive !== undefined) client.isActive = input.isActive;

    await client.save();

    return {
      id: String(client._id),
      clientId: client.clientId,
      name: client.name,
      description: client.description ?? undefined,
      isActive: client.isActive,
      allowedScopes: client.allowedScopes,
      tokenExpiresIn: client.tokenExpiresIn,
      lastUsed: client.lastUsed ?? undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  @Mutation(() => Boolean)
  async deleteClient(
    @Arg('clientId') clientId: string,
    @Ctx() context: GraphQLContext
  ): Promise<boolean> {
    context.hasAppAdminScope(context);

    const result = await Client.deleteOne({ clientId });
    return result.deletedCount > 0;
  }

  @Mutation(() => String)
  async regenerateClientSecret(
    @Arg('clientId') clientId: string,
    @Ctx() context: GraphQLContext
  ): Promise<string> {
    context.hasAppAdminScope(context);

    const client = await Client.findOne({ clientId });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // Generate new secret
    const newSecret = generateClientSecret();
    const hashedSecret = await hashClientSecret(newSecret);

    // Update client
    client.clientSecret = hashedSecret;
    await client.save();

    // Return the plain text secret (only time it's shown)
    return newSecret;
  }
}
