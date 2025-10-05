/** biome-ignore-all lint/complexity/noStaticOnlyClass: I see no issue with this */
import bcrypt from 'bcrypt';
import validator from 'validator';
import { EmailVerification } from '../models/EmailVerification';
import { User } from '../models/User';
import {
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../utils/errors';

export interface VerificationCodeResult {
  code: string;
  hashedCode: string;
  expiresAt: Date;
}

export interface VerificationValidationResult {
  verification: typeof EmailVerification.prototype;
  isValid: boolean;
  remainingAttempts?: number;
}

export class VerificationService {
  private static readonly CODE_EXPIRY_MINUTES = 15;
  private static readonly RATE_LIMIT_MINUTES = 1;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly BCRYPT_ROUNDS = 12;

  // Public getters for test usage
  static get CODE_EXPIRY_MINUTES_VALUE(): number {
    return VerificationService.CODE_EXPIRY_MINUTES;
  }

  static get MAX_ATTEMPTS_VALUE(): number {
    return VerificationService.MAX_ATTEMPTS;
  }

  static get BCRYPT_ROUNDS_VALUE(): number {
    return VerificationService.BCRYPT_ROUNDS;
  }

  /**
   * Generate a 6-digit verification code and its hashed version
   */
  static generateVerificationCode(): VerificationCodeResult {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() + VerificationService.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    return {
      code,
      hashedCode: '', // Will be hashed separately to handle async
      expiresAt,
    };
  }

  /**
   * Hash a verification code with bcrypt
   */
  static async hashVerificationCode(code: string): Promise<string> {
    return bcrypt.hash(code, VerificationService.BCRYPT_ROUNDS);
  }

  /**
   * Validate email format
   */
  static validateEmailFormat(email: string): void {
    if (!validator.isEmail(email)) {
      throw new ValidationError('Please provide a valid email address');
    }
  }

  /**
   * Validate verification code format (6 digits)
   */
  static validateVerificationCodeFormat(code: string): void {
    if (!/^\d{6}$/.test(code)) {
      throw new ValidationError('Verification code must be exactly 6 digits');
    }
  }

  /**
   * Check if user exists and return formatted email
   */
  static async checkUserExists(email: string): Promise<{
    emailFormatted: string;
    user: typeof User.prototype | null;
  }> {
    const emailFormatted = email.toLowerCase();
    const user = await User.findOne({ email: emailFormatted });

    return { emailFormatted, user };
  }

  /**
   * Enforce rate limiting for verification code requests
   */
  static async enforceRateLimit(email: string): Promise<void> {
    const recentVerification = await EmailVerification.findOne({
      email,
      createdAt: {
        $gte: new Date(
          Date.now() - VerificationService.RATE_LIMIT_MINUTES * 60 * 1000
        ),
      },
    });

    if (recentVerification) {
      throw new TooManyRequestsError(
        `Please wait at least ${VerificationService.RATE_LIMIT_MINUTES} minute before requesting another verification code`
      );
    }
  }

  /**
   * Clean up existing verification codes for an email
   */
  static async cleanupExistingVerifications(email: string): Promise<void> {
    await EmailVerification.deleteMany({ email });
  }

  /**
   * Create a new verification record
   */
  static async createVerificationRecord(
    email: string,
    hashedCode: string,
    expiresAt: Date
  ): Promise<typeof EmailVerification.prototype> {
    const verification = new EmailVerification({
      email,
      code: hashedCode,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    await verification.save();
    return verification;
  }

  /**
   * Find and validate verification code
   */
  static async findAndValidateVerification(
    email: string,
    verificationCode: string
  ): Promise<VerificationValidationResult> {
    // Find verification record
    const verification = await EmailVerification.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!verification) {
      throw new NotFoundError(
        'Verification code not found or expired. Please request a new code.'
      );
    }

    // Check attempt limit
    if (verification.attempts >= VerificationService.MAX_ATTEMPTS) {
      // Clean up failed verification
      await EmailVerification.deleteOne({ _id: verification._id });
      throw new TooManyRequestsError(
        'Too many failed attempts. Please request a new verification code.'
      );
    }

    // Verify the code
    const isValid = await bcrypt.compare(verificationCode, verification.code);

    if (!isValid) {
      // Increment attempts
      verification.attempts += 1;
      await verification.save();

      const remainingAttempts =
        VerificationService.MAX_ATTEMPTS - verification.attempts;

      if (remainingAttempts > 0) {
        throw new ValidationError(
          `Invalid verification code. ${remainingAttempts} attempts remaining.`
        );
      } else {
        // Don't delete yet - let the next attempt trigger the TOO_MANY_REQUESTS error
        throw new ValidationError(
          'Invalid verification code. Please request a new code.'
        );
      }
    }

    return {
      verification,
      isValid: true,
    };
  }

  /**
   * Complete verification by cleaning up records
   */
  static async completeVerification(email: string): Promise<void> {
    await EmailVerification.deleteMany({ email });
  }

  /**
   * Update user's last login timestamp
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: { lastLoginAt: new Date() },
        $unset: { loginCodeSentAt: 1 }, // Clean up any login tracking fields
      }
    );
  }
}
