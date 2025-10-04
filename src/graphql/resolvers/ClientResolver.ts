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
  UnauthorizedError,
} from '../../utils/errors';
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
    // Only allow authenticated clients with admin scope
    if (!context.isAuthenticated || !context.hasScope('admin')) {
      throw new UnauthorizedError('Admin access required');
    }

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
    if (!context.isAuthenticated) {
      throw new UnauthorizedError('Authentication required');
    }

    const isOwnClient = context.client?.clientId === clientId;
    const isAdmin = context.hasScope('admin');

    if (!isOwnClient && !isAdmin) {
      throw new ForbiddenError(
        'Can only view own client info or need admin access'
      );
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
    if (!context.isAuthenticated || !context.hasScope('admin')) {
      throw new UnauthorizedError('Admin access required');
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
      allowedScopes: input.allowedScopes,
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
    // Only allow authenticated clients with admin scope
    if (!context.isAuthenticated || !context.hasScope('admin')) {
      throw new UnauthorizedError('Admin access required');
    }

    const client = await Client.findOne({ clientId });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // Update fields
    if (input.name !== undefined) client.name = input.name;
    if (input.description !== undefined) client.description = input.description;
    if (input.allowedScopes !== undefined)
      client.allowedScopes = input.allowedScopes;
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
    // Only allow authenticated clients with admin scope
    if (!context.isAuthenticated || !context.hasScope('admin')) {
      throw new UnauthorizedError('Admin access required');
    }

    const result = await Client.deleteOne({ clientId });
    return result.deletedCount > 0;
  }

  @Mutation(() => String)
  async regenerateClientSecret(
    @Arg('clientId') clientId: string,
    @Ctx() context: GraphQLContext
  ): Promise<string> {
    // Only allow authenticated clients with admin scope
    if (!context.isAuthenticated || !context.hasScope('admin')) {
      throw new UnauthorizedError('Admin access required');
    }

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
