import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { emailService } from '../../config/email';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Signup } from '../../models/Signup';
import { User } from '../../models/User';
import { VerificationService } from '../../services/verification.service';
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

    try {
      // Validate email format
      VerificationService.validateEmailFormat(email);

      // Check if user already exists
      const { emailFormatted, user: existingUser } =
        await VerificationService.checkUserExists(email);
      if (existingUser) {
        throw new ConflictError(
          'An account with this email address already exists'
        );
      }

      // Rate limiting check
      await VerificationService.enforceRateLimit(emailFormatted);

      // Clean up any existing verification codes and pending signups
      await VerificationService.cleanupExistingVerifications(emailFormatted);
      await Signup.deleteMany({ email: emailFormatted });

      // Generate verification code
      const { code, expiresAt } =
        VerificationService.generateVerificationCode();
      const hashedCode = await VerificationService.hashVerificationCode(code);

      // Create verification record
      await VerificationService.createVerificationRecord(
        emailFormatted,
        hashedCode,
        expiresAt
      );

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
      // Re-throw specific errors from VerificationService
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof UnauthorizedError ||
        error instanceof ValidationError ||
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

    try {
      // Validate email format
      VerificationService.validateEmailFormat(email);

      // Validate verification code format
      VerificationService.validateVerificationCodeFormat(verificationCode);

      // Check if user already exists (double-check)
      const { emailFormatted, user: existingUser } =
        await VerificationService.checkUserExists(email);
      if (existingUser) {
        throw new ConflictError(
          'An account with this email address already exists'
        );
      }

      // Find and validate verification code
      await VerificationService.findAndValidateVerification(
        emailFormatted,
        verificationCode
      );

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
      await VerificationService.completeVerification(emailFormatted);
      await Signup.deleteOne({ email: emailFormatted });

      return {
        success: true,
        message: 'Account created successfully! Welcome to Witchly!',
        user: user as GraphQLUser,
      };
    } catch (error) {
      // Re-throw specific errors from VerificationService
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof UnauthorizedError ||
        error instanceof ValidationError ||
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
