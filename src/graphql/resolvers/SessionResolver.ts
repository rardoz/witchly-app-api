import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { SessionService } from '../../services/session.service';
import { UnauthorizedError } from '../../utils/errors';
import {
  LogoutAllSessionsResponse,
  LogoutResponse,
  RefreshSessionInput,
  RefreshSessionResponse,
  SessionInfoType,
} from '../types/SessionTypes';

@Resolver()
export class SessionResolver {
  @Query(() => [SessionInfoType])
  async mySessions(@Ctx() context: GraphQLContext): Promise<SessionInfoType[]> {
    if (!context.isUserAuthenticated || !context.sessionInfo) {
      throw new UnauthorizedError('User session required to view sessions');
    }

    const sessions = await SessionService.getUserSessions(
      context.sessionInfo.userId
    );

    return sessions.map((session) => ({
      sessionId: session._id as string,
      keepMeLoggedIn: session.keepMeLoggedIn,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isActive: session.isActive,
      createdAt: session.createdAt,
    }));
  }

  @Mutation(() => RefreshSessionResponse)
  async refreshSession(
    @Arg('input') input: RefreshSessionInput
  ): Promise<RefreshSessionResponse> {
    const sessionResponse = await SessionService.refreshSession(
      input.refreshToken
    );

    return {
      sessionToken: sessionResponse.sessionToken,
      refreshToken: sessionResponse.refreshToken,
      expiresIn: sessionResponse.expiresIn,
      expiresAt: sessionResponse.expiresAt,
    };
  }

  @Mutation(() => LogoutResponse)
  async logout(@Ctx() context: GraphQLContext): Promise<LogoutResponse> {
    if (!context.isUserAuthenticated || !context.sessionInfo) {
      throw new UnauthorizedError('User session required to logout');
    }

    await SessionService.terminateSession(
      context.sessionInfo.sessionId,
      context.sessionInfo.userId
    );

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  @Mutation(() => LogoutAllSessionsResponse)
  async logoutAllSessions(
    @Ctx() context: GraphQLContext
  ): Promise<LogoutAllSessionsResponse> {
    if (!context.isUserAuthenticated || !context.sessionInfo) {
      throw new UnauthorizedError(
        'User session required to logout from all sessions'
      );
    }

    const sessionsTerminated = await SessionService.terminateAllSessions(
      context.sessionInfo.userId
    );

    return {
      success: true,
      message: `Successfully logged out from ${sessionsTerminated} sessions`,
      sessionsTerminated,
    };
  }
}
