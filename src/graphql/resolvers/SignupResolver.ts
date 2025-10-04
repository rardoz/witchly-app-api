import bcrypt from 'bcrypt';
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import validator from 'validator';
import { emailService } from '../../config/email';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { EmailVerification } from '../../models/EmailVerification';
import { Signup } from '../../models/Signup';
import { User } from '../../models/User';
import {
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import {
  CompleteSignupInput,
  InitiateSignupInput,
} from '../inputs/SignupInput';
import {
  CompleteSignupResponse,
  InitiateSignupResponse,
} from '../types/SignupTypes';
import { User as GraphQLUser } from '../types/User';

@Resolver()
export class SignupResolver {
  @Mutation(() => InitiateSignupResponse)
  async initiateSignup(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: InitiateSignupInput
  ): Promise<InitiateSignupResponse> {
    if (!context.isAuthenticated || !context.hasScope('write')) {
      throw new UnauthorizedError('Write access required');
    }

    const { email } = input;
    const emailFormatted = email.toLowerCase();

    try {
      // Validate email format
      if (!validator.isEmail(email)) {
        throw new ValidationError('Please provide a valid email address');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: emailFormatted });
      if (existingUser) {
        throw new ConflictError(
          'An account with this email address already exists'
        );
      }

      // Check for existing unverified code first
      const existingVerification = await EmailVerification.findOne({
        email: emailFormatted,
        verified: false,
      });

      // Rate limiting: if there's an existing code created less than 1 minute ago, reject
      if (existingVerification) {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        if (existingVerification.createdAt > oneMinuteAgo) {
          throw new TooManyRequestsError(
            'Please wait at least 1 minute before requesting another verification code.'
          );
        }
      }

      // Clean up any existing unverified codes for this email
      await EmailVerification.deleteMany({
        email: emailFormatted,
        verified: false,
      });

      // Clean up any existing pending signup for this email
      await Signup.deleteMany({
        email: emailFormatted,
      });

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await bcrypt.hash(code, 10);

      // Set expiration to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create verification record
      const verification = new EmailVerification({
        email: emailFormatted,
        code: hashedCode,
        expiresAt,
        attempts: 0,
        verified: false,
      });

      await verification.save();

      // Store minimal pending signup (only email)
      const pendingSignup = new Signup({
        email: emailFormatted,
      });

      await pendingSignup.save();

      // Send verification email
      try {
        await emailService.sendVerificationCode(email, code);
        console.log(`Verification code sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Still return success since the verification record was created
        // The user can request a new code if needed
      }

      return {
        success: true,
        message: 'Verification code sent to your email address',
        expiresAt,
      };
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof ConflictError ||
        error instanceof TooManyRequestsError
      ) {
        throw error;
      }

      console.error('Error in initiateSignup:', error);
      throw new Error('An error occurred while processing your request');
    }
  }

  @Mutation(() => CompleteSignupResponse)
  async completeSignup(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CompleteSignupInput
  ): Promise<CompleteSignupResponse> {
    if (!context.isAuthenticated || !context.hasScope('write')) {
      throw new UnauthorizedError('Write access required');
    }
    const { email, verificationCode } = input;
    const emailFormatted = email.toLowerCase();
    try {
      // Validate email format
      if (!validator.isEmail(email)) {
        throw new ValidationError('Please provide a valid email address');
      }

      // Validate verification code format
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new ValidationError('Verification code must be exactly 6 digits');
      }

      // Find verification record
      const verification = await EmailVerification.findOne({
        email: emailFormatted,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!verification) {
        throw new NotFoundError('Invalid or expired verification code');
      }

      // Check attempts limit
      if (verification.attempts >= 3) {
        await EmailVerification.deleteOne({ _id: verification._id });
        throw new TooManyRequestsError(
          'Too many attempts. Please request a new verification code.'
        );
      }

      // Verify the code
      const isValidCode = await bcrypt.compare(
        verificationCode,
        verification.code
      );

      if (!isValidCode) {
        // Increment attempts
        verification.attempts += 1;
        await verification.save();

        const remainingAttempts = 3 - verification.attempts;
        throw new ValidationError(
          remainingAttempts > 0
            ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
            : 'Invalid verification code. Please request a new code.'
        );
      }

      // Check if user already exists (double-check)
      const existingUser = await User.findOne({ email: emailFormatted });
      if (existingUser) {
        throw new ConflictError(
          'An account with this email address already exists'
        );
      }

      // Get the pending signup data
      const pendingSignup = await Signup.findOne({
        email: emailFormatted,
      });
      if (!pendingSignup) {
        throw new NotFoundError(
          'Signup data not found. Please start the signup process again.'
        );
      }

      // Generate unique handle
      const handle = await this.generateUniqueHandle();

      // Create minimal user with just email and auto-generated handle
      const user = new User({
        email: emailFormatted,
        userType: 'basic',
        emailVerified: true,
        handle,
        // All profile fields will be undefined/empty initially
        // Users will fill these out later on the profile page
      });

      await user.save();

      // Clean up verification and pending signup
      await EmailVerification.deleteOne({ email: emailFormatted });
      await Signup.deleteOne({ email: emailFormatted });

      return {
        success: true,
        message: 'Account created successfully! Welcome to Witchly!',
        user: user as GraphQLUser,
      };
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof TooManyRequestsError
      ) {
        throw error;
      }

      console.error('Error in completeSignup:', error);
      throw new Error('An error occurred while creating your account');
    }
  }

  /**
   * Generate a unique handle in the format: adjective_number
   * e.g., "wizard_42", "ninja_789"
   */
  private async generateUniqueHandle(): Promise<string> {
    const adjectives = [
      'swift',
      'bright',
      'clever',
      'brave',
      'wise',
      'bold',
      'calm',
      'kind',
      'quick',
      'sharp',
      'smart',
      'strong',
      'clear',
      'cool',
      'warm',
      'gentle',
      'mystic',
      'cosmic',
      'lunar',
      'solar',
      'stellar',
      'crystal',
      'golden',
      'silver',
      'azure',
      'crimson',
      'jade',
      'amber',
      'violet',
      'emerald',
    ];

    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const adjective =
        adjectives[Math.floor(Math.random() * adjectives.length)];
      const number = Math.floor(Math.random() * 10000); // 0-9999
      const handle = `${adjective}_${number}`;

      // Check if handle already exists
      const existingUser = await User.findOne({ handle });
      if (!existingUser) {
        return handle;
      }

      attempts++;
    }

    // Fallback to random string if all attempts failed
    const randomString = Math.random().toString(36).substring(2, 8);
    const randomNumber = Math.floor(Math.random() * 10000);
    return `user_${randomString}_${randomNumber}`;
  }
}
