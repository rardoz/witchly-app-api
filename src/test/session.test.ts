import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { SessionService } from '../services/session.service';
import { NotFoundError, UnauthorizedError } from '../utils/errors';

describe('SessionService', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      allowedScopes: ['read', 'write', 'basic'],
      handle: 'johndoe123',
      emailVerified: true,
    });
    await user.save();
    testUserId = String(user._id); // Convert ObjectId to string
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await UserSession.deleteMany({ userId: testUserId });
    await User.deleteOne({ _id: testUserId });
  });

  afterEach(async () => {
    // Clean up sessions after each test
    await UserSession.deleteMany({ userId: testUserId });
  });

  describe('createSession', () => {
    it('should create a short session (4 hours) when keepMeLoggedIn is false', async () => {
      const sessionResponse = await SessionService.createSession(
        testUserId,
        false,
        'Test User Agent',
        '127.0.0.1'
      );

      expect(sessionResponse).toHaveProperty('sessionToken');
      expect(sessionResponse).toHaveProperty('expiresIn');
      expect(sessionResponse).toHaveProperty('expiresAt');
      expect(sessionResponse.refreshToken).toBeUndefined();
      expect(sessionResponse.expiresIn).toBe(
        SessionService.SHORT_SESSION_HOURS_VALUE * 3600
      );

      // Verify session in database
      const session = await UserSession.findOne({ userId: testUserId });
      expect(session).toBeTruthy();
      expect(session?.keepMeLoggedIn).toBe(false);
      expect(session?.userAgent).toBe('Test User Agent');
      expect(session?.ipAddress).toBe('127.0.0.1');
    });

    it('should create a long session (90 days) when keepMeLoggedIn is true', async () => {
      const sessionResponse = await SessionService.createSession(
        testUserId,
        true,
        'Test User Agent',
        '127.0.0.1'
      );

      expect(sessionResponse).toHaveProperty('sessionToken');
      expect(sessionResponse).toHaveProperty('refreshToken');
      expect(sessionResponse).toHaveProperty('expiresIn');
      expect(sessionResponse).toHaveProperty('expiresAt');
      expect(sessionResponse.expiresIn).toBe(
        SessionService.LONG_SESSION_DAYS_VALUE * 24 * 3600
      );

      // Verify session in database
      const session = await UserSession.findOne({ userId: testUserId });
      expect(session).toBeTruthy();
      expect(session?.keepMeLoggedIn).toBe(true);
      expect(session?.refreshToken).toBeTruthy();
    });

    it('should enforce session limit per user', async () => {
      // Create maximum number of sessions
      for (let i = 0; i < SessionService.MAX_SESSIONS_PER_USER_VALUE; i++) {
        await SessionService.createSession(testUserId, false);
      }

      // Verify we have the maximum number of sessions
      let sessionCount = await UserSession.countDocuments({
        userId: testUserId,
        isActive: true,
      });
      expect(sessionCount).toBe(SessionService.MAX_SESSIONS_PER_USER_VALUE);

      // Create one more session - should remove the oldest
      await SessionService.createSession(testUserId, false);

      sessionCount = await UserSession.countDocuments({
        userId: testUserId,
        isActive: true,
      });
      expect(sessionCount).toBe(SessionService.MAX_SESSIONS_PER_USER_VALUE);
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session token', async () => {
      const sessionResponse = await SessionService.createSession(
        testUserId,
        false
      );

      const sessionInfo = await SessionService.validateSession(
        sessionResponse.sessionToken
      );

      expect(sessionInfo).toBeTruthy();
      expect(sessionInfo?.userId).toBe(testUserId);
      expect(sessionInfo?.keepMeLoggedIn).toBe(false);
      expect(sessionInfo?.sessionId).toBeTruthy();
    });

    it('should return null for invalid session token', async () => {
      const sessionInfo = await SessionService.validateSession('invalid-token');
      expect(sessionInfo).toBeNull();
    });

    it('should return null for expired session', async () => {
      // Create a session
      const sessionResponse = await SessionService.createSession(
        testUserId,
        false
      );

      // Manually expire the session
      await UserSession.updateOne(
        { userId: testUserId },
        { expiresAt: new Date(Date.now() - 1000) } // 1 second ago
      );

      const sessionInfo = await SessionService.validateSession(
        sessionResponse.sessionToken
      );
      expect(sessionInfo).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should refresh a valid session with refresh token', async () => {
      const sessionResponse = await SessionService.createSession(
        testUserId,
        true
      );

      expect(sessionResponse.refreshToken).toBeTruthy();

      const refreshToken = sessionResponse.refreshToken;
      if (!refreshToken) {
        throw new Error(
          'Refresh token should be present for keepMeLoggedIn sessions'
        );
      }

      const refreshedResponse = await SessionService.refreshSession(
        refreshToken,
        testUserId
      );

      expect(refreshedResponse).toHaveProperty('sessionToken');
      expect(refreshedResponse).toHaveProperty('refreshToken');
      expect(refreshedResponse).toHaveProperty('expiresIn');
      expect(refreshedResponse).toHaveProperty('expiresAt');
      expect(refreshedResponse.refreshToken).toBe(sessionResponse.refreshToken);

      // The new session token should be valid and have updated expiration
      expect(refreshedResponse.sessionToken).toBeTruthy();
      expect(refreshedResponse.expiresAt.getTime()).toBeGreaterThan(
        sessionResponse.expiresAt.getTime()
      );
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(
        SessionService.refreshSession('invalid-refresh-token')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw error for empty refresh token', async () => {
      await expect(SessionService.refreshSession('')).rejects.toThrow(
        'Refresh token is required'
      );
    });

    it('should throw error when refresh token belongs to different user', async () => {
      // Create another test user
      const anotherUser = new User({
        name: 'Another Test User',
        email: 'another.test@example.com',
        scopes: ['read', 'write', 'basic'],
        handle: 'another_test',
        emailVerified: true,
      });
      await anotherUser.save();
      const anotherUserId = String(anotherUser._id);

      // Create session for the other user
      const sessionResponse = await SessionService.createSession(
        anotherUserId,
        true
      );

      const refreshToken = sessionResponse.refreshToken;
      if (!refreshToken) {
        throw new Error('Refresh token should be present');
      }

      // Try to refresh with wrong user ID
      await expect(
        SessionService.refreshSession(refreshToken, testUserId)
      ).rejects.toThrow('Refresh token does not belong to the current user');

      // Clean up
      await User.deleteOne({ _id: anotherUserId });
      await UserSession.deleteMany({ userId: anotherUserId });
    });

    it('should throw error for refresh token on short session', async () => {
      // Short sessions don't have refresh tokens
      const sessionResponse = await SessionService.createSession(
        testUserId,
        false
      );
      expect(sessionResponse.refreshToken).toBeUndefined();

      await expect(
        SessionService.refreshSession('fake-refresh-token')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('terminateSession', () => {
    it('should terminate a specific session', async () => {
      const sessionResponse = await SessionService.createSession(
        testUserId,
        false
      );

      // Validate session first
      const sessionInfo = await SessionService.validateSession(
        sessionResponse.sessionToken
      );
      expect(sessionInfo).toBeTruthy();

      if (!sessionInfo) {
        throw new Error('Session info should be present');
      }

      // Terminate session
      await SessionService.terminateSession(sessionInfo.sessionId, testUserId);

      // Session should no longer be valid
      const validationAfterTermination = await SessionService.validateSession(
        sessionResponse.sessionToken
      );
      expect(validationAfterTermination).toBeNull();

      // Session should be marked as inactive in database
      const session = await UserSession.findById(sessionInfo.sessionId);
      expect(session?.isActive).toBe(false);
    });

    it('should throw error when terminating non-existent session', async () => {
      await expect(
        SessionService.terminateSession('60f1b2b8b0a0a0a0a0a0a0a0', testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('terminateAllSessions', () => {
    it('should terminate all sessions for a user', async () => {
      // Create multiple sessions
      await SessionService.createSession(testUserId, false);
      await SessionService.createSession(testUserId, true);
      await SessionService.createSession(testUserId, false);

      // Verify sessions exist
      let activeSessions = await UserSession.countDocuments({
        userId: testUserId,
        isActive: true,
      });
      expect(activeSessions).toBe(3);

      // Terminate all sessions
      const terminatedCount =
        await SessionService.terminateAllSessions(testUserId);
      expect(terminatedCount).toBe(3);

      // Verify no active sessions remain
      activeSessions = await UserSession.countDocuments({
        userId: testUserId,
        isActive: true,
      });
      expect(activeSessions).toBe(0);
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      // Create multiple sessions
      await SessionService.createSession(testUserId, false, 'Browser 1');
      await SessionService.createSession(testUserId, true, 'Browser 2');
      await SessionService.createSession(testUserId, false, 'Mobile App');

      const sessions = await SessionService.getUserSessions(testUserId);

      expect(sessions).toHaveLength(3);
      if (sessions.length > 0) {
        expect(sessions[0]).toHaveProperty('userAgent');
      }
      expect(sessions.every((s) => s.isActive)).toBe(true);
      expect(sessions.every((s) => s.userId === testUserId)).toBe(true);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired and inactive sessions', async () => {
      // Create active sessions
      await SessionService.createSession(testUserId, false);
      await SessionService.createSession(testUserId, true);

      // Create expired session manually
      const expiredSession = new UserSession({
        userId: testUserId,
        sessionToken: 'expired-token',
        keepMeLoggedIn: false,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        lastUsedAt: new Date(),
        isActive: true,
      });
      await expiredSession.save();

      // Create inactive session manually
      const inactiveSession = new UserSession({
        userId: testUserId,
        sessionToken: 'inactive-token',
        keepMeLoggedIn: false,
        expiresAt: new Date(Date.now() + 3600000), // Valid for 1 hour
        lastUsedAt: new Date(),
        isActive: false,
      });
      await inactiveSession.save();

      // Verify total sessions before cleanup
      let totalSessions = await UserSession.countDocuments({
        userId: testUserId,
      });
      expect(totalSessions).toBe(4);

      // Cleanup expired sessions
      const cleanedCount =
        await SessionService.cleanupExpiredSessions(testUserId);
      expect(cleanedCount).toBe(2); // Should remove expired and inactive sessions

      // Verify only active, non-expired sessions remain
      totalSessions = await UserSession.countDocuments({ userId: testUserId });
      expect(totalSessions).toBe(2);

      const activeSessions = await UserSession.countDocuments({
        userId: testUserId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });
      expect(activeSessions).toBe(2);
    });
  });
});
