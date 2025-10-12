import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { emailService } from '../../config/email';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { SessionService } from '../../services/session.service';
import { VerificationService } from '../../services/verification.service';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { InitiateLoginInput } from '../inputs/LoginInput';
import {
  CompleteLoginInput,
  CompleteLoginResponse,
  InitiateLoginResponse,
} from '../types/LoginTypes';

@Resolver()
export class LoginResolver {
  @Mutation(() => InitiateLoginResponse)
  async initiateLogin(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: InitiateLoginInput
  ): Promise<InitiateLoginResponse> {
    context.hasAppWriteScope(context);

    const { email } = input;
    // Validate email format
    VerificationService.validateEmailFormat(email);

    // Check if user exists and is verified
    const { emailFormatted, user: existingUser } =
      await VerificationService.checkUserExists(email);

    if (!existingUser) {
      throw new NotFoundError(
        'No account found with this email address. Please sign up first.'
      );
    }

    if (!existingUser.emailVerified) {
      throw new ValidationError(
        'Email address not verified. Please complete the signup process first.'
      );
    }

    // Rate limiting check
    await VerificationService.enforceRateLimit(emailFormatted);

    // Clean up any existing verification codes
    await VerificationService.cleanupExistingVerifications(emailFormatted);

    // Generate verification code
    const { code, expiresAt } = VerificationService.generateVerificationCode();
    const hashedCode = await VerificationService.hashVerificationCode(code);

    // Create verification record
    await VerificationService.createVerificationRecord(
      emailFormatted,
      hashedCode,
      expiresAt
    );

    // Send login verification email
    try {
      await emailService.sendLoginVerificationCode(
        emailFormatted,
        code,
        existingUser.name || 'there'
      );
    } catch (emailError) {
      console.error('Login email sending failed:', emailError);
      // Don't throw - verification record is saved, user can still complete login
    }
    return {
      success: true,
      message: `Verification code sent to ${emailFormatted}`,
      expiresAt: expiresAt,
    };
  }

  @Mutation(() => CompleteLoginResponse)
  async completeLogin(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CompleteLoginInput
  ): Promise<CompleteLoginResponse> {
    context.hasAppWriteScope(context);

    const { email, verificationCode, keepMeLoggedIn = false } = input;

    // Validate email format
    VerificationService.validateEmailFormat(email);
    // Validate verification code format
    VerificationService.validateVerificationCodeFormat(verificationCode);

    // Check if user exists and is verified
    const { emailFormatted, user } =
      await VerificationService.checkUserExists(email);

    if (!user) {
      throw new NotFoundError(
        'No account found with this email address. Please sign up first.'
      );
    }

    if (!user.emailVerified) {
      throw new ValidationError(
        'Email address not verified. Please complete the signup process first.'
      );
    }

    // Find and validate verification code
    await VerificationService.findAndValidateVerification(
      emailFormatted,
      verificationCode
    );

    // Mark verification as complete and clean up
    await VerificationService.completeVerification(emailFormatted);

    // Update user's last login time
    await VerificationService.updateLastLogin(user._id as string);

    // Create user session with automatic request info extraction
    const sessionResponse = await SessionService.createSession(
      user._id as string,
      keepMeLoggedIn,
      context.request
    );

    return {
      success: true,
      message: `Welcome back, ${user.name || user.handle}!`,
      sessionToken: sessionResponse.sessionToken,
      refreshToken: sessionResponse.refreshToken,
      expiresIn: sessionResponse.expiresIn,
      expiresAt: sessionResponse.expiresAt,
      userId: user._id as string,
    };
  }
}
