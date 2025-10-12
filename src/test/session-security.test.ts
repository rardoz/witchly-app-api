import { type Request } from 'express';
import { type IUser, User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { SessionService } from '../services/session.service';

// Mock Express Request type for testing that matches what SessionService expects
interface MockRequest extends Partial<Request> {
  headers: Record<string, string>;
  ip: string;
}

describe('Session Security', () => {
  beforeEach(async () => {
    // Clean up before each test with more specific targeting
    await User.deleteMany({
      email: { $regex: /security\.test|overload\.test/ },
    });
    await UserSession.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test to ensure no data leakage
    await User.deleteMany({
      email: { $regex: /security\.test|overload\.test/ },
    });
    await UserSession.deleteMany({});
  });

  describe('extractRequestInfo', () => {
    it('should extract user agent and IP address from request', () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        ip: '192.168.1.100',
      };

      const requestInfo = SessionService.extractRequestInfo(
        mockRequest as Request
      );

      expect(requestInfo.userAgent).toBe(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );
      expect(requestInfo.ipAddress).toBe('192.168.1.100');
    });

    it('should handle missing headers gracefully', () => {
      const mockRequest: MockRequest = {
        headers: {},
        ip: '192.168.1.100',
      };

      const requestInfo = SessionService.extractRequestInfo(
        mockRequest as Request
      );

      expect(requestInfo.userAgent).toBeUndefined();
      expect(requestInfo.ipAddress).toBe('192.168.1.100');
    });

    it('should handle X-Forwarded-For header for proxied requests', () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Mobile Browser',
          'x-forwarded-for': '203.0.113.0, 192.168.1.1',
        },
        ip: '192.168.1.1',
      };

      const requestInfo = SessionService.extractRequestInfo(
        mockRequest as Request
      );

      expect(requestInfo.userAgent).toBe('Mobile Browser');
      expect(requestInfo.ipAddress).toBe('203.0.113.0'); // Should use first IP from X-Forwarded-For
    });
  });

  describe('Session Security Validation', () => {
    let testUser: IUser;
    let sessionToken: string;

    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        email: 'security.test@example.com',
        emailVerified: true,
        handle: 'securitytest',
        scopes: ['read', 'write', 'basic'],
      }) as IUser;
      await testUser.save();

      // Create a session
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Original Browser',
        },
        ip: '192.168.1.100',
      };

      const sessionResponse = await SessionService.createSession(
        String(testUser._id),
        false,
        mockRequest as Request
      );

      sessionToken = sessionResponse.sessionToken;
    });

    it('should validate session successfully with same IP and UserAgent', async () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Original Browser',
        },
        ip: '192.168.1.100',
      };

      const result = await SessionService.validateSession(
        sessionToken,
        mockRequest as Request
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.userId).toBe(String(testUser._id));
        expect(result.userAgent).toBe('Original Browser');
        expect(result.ipAddress).toBe('192.168.1.100');
      }
    });

    it('should validate when security checks are disabled', async () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Different Browser/1.0', // Different UserAgent
        },
        ip: '192.168.1.200', // Different IP
      };

      // When security checks are explicitly disabled
      const result = await SessionService.validateSession(
        sessionToken,
        mockRequest as Request,
        false
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.userId).toBe(String(testUser._id));
      }
    });

    it('should reject when IP changes with security checks enforced', async () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Original Browser',
        },
        ip: '192.168.1.200', // Different IP
      };

      // Security checks are enforced by default
      await expect(
        SessionService.validateSession(
          sessionToken,
          mockRequest as Request,
          true
        )
      ).rejects.toThrow(
        'Session terminated due to security policy violation: IP address changed'
      );
    });

    it('should reject when UserAgent changes with security checks enforced', async () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Different Browser/2.0', // Different UserAgent
        },
        ip: '192.168.1.100', // Same IP
      };

      // Security checks are enforced by default
      await expect(
        SessionService.validateSession(
          sessionToken,
          mockRequest as Request,
          true
        )
      ).rejects.toThrow(
        'Session terminated due to security policy violation: User-Agent changed'
      );
    });

    it('should allow refresh token (security validation moved to validateSession)', async () => {
      // First, create a session with longer expiration
      const longSessionResponse = await SessionService.createSession(
        String(testUser._id),
        true, // keepMeLoggedIn = true for refresh token
        'Original Browser',
        '192.168.1.100'
      );

      const refreshToken = longSessionResponse.refreshToken;
      expect(refreshToken).toBeDefined();

      // Note: refreshSession no longer validates IP/UserAgent changes
      // Security validation is now only done in validateSession
      if (refreshToken) {
        const refreshResult = await SessionService.refreshSession(
          refreshToken,
          String(testUser._id)
        );
        expect(refreshResult.sessionToken).toBeDefined();
        expect(refreshResult.refreshToken).toBeDefined();
      }
    });

    it('should allow refresh token with same IP', async () => {
      // Create a session with refresh token
      const longSessionResponse = await SessionService.createSession(
        String(testUser._id),
        true,
        'Original Browser',
        '192.168.1.100'
      );

      const refreshToken = longSessionResponse.refreshToken;
      expect(refreshToken).toBeDefined();

      // Test successful refresh
      if (refreshToken) {
        const refreshResult = await SessionService.refreshSession(
          refreshToken,
          String(testUser._id)
        );

        expect(refreshResult.sessionToken).toBeDefined();
        expect(refreshResult.refreshToken).toBeDefined();
      }
    });
  });

  describe('createSession overloads', () => {
    let testUser: IUser;

    beforeEach(async () => {
      testUser = new User({
        email: 'overload.test@example.com',
        emailVerified: true,
        handle: 'overloadtest',
        scopes: ['read', 'write', 'basic'],
      }) as IUser;
      await testUser.save();
    });

    it('should work with direct parameters', async () => {
      const result = await SessionService.createSession(
        String(testUser._id),
        false,
        'Direct Browser',
        '192.168.1.50'
      );

      expect(result.sessionToken).toBeDefined();

      // Find session in database to verify userAgent and ipAddress
      const session = await UserSession.findOne({
        userId: String(testUser._id),
      });
      expect(session?.userAgent).toBe('Direct Browser');
      expect(session?.ipAddress).toBe('192.168.1.50');
    });

    it('should work with Request object', async () => {
      const mockRequest: MockRequest = {
        headers: {
          'user-agent': 'Request Object Browser',
        },
        ip: '192.168.1.75',
      };

      const result = await SessionService.createSession(
        String(testUser._id),
        false,
        mockRequest as Request
      );

      expect(result.sessionToken).toBeDefined();

      // Find session in database to verify userAgent and ipAddress
      const session = await UserSession.findOne({
        userId: String(testUser._id),
      });
      expect(session?.userAgent).toBe('Request Object Browser');
      expect(session?.ipAddress).toBe('192.168.1.75');
    });
  });
});
