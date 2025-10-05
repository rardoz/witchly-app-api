import { IsEmail, Matches } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { VALIDATION_CONSTANTS } from '../../shared/profile.schema';

@InputType()
export class InitiateLoginInput {
  @Field()
  @IsEmail({}, { message: VALIDATION_CONSTANTS.EMAIL.message })
  email: string;
}

@InputType()
export class CompleteLoginInput {
  @Field()
  @IsEmail({}, { message: VALIDATION_CONSTANTS.EMAIL.message })
  email: string;

  @Field()
  @Matches(VALIDATION_CONSTANTS.VERIFICATION_CODE.pattern, {
    message: VALIDATION_CONSTANTS.VERIFICATION_CODE.message,
  })
  verificationCode: string;
}
