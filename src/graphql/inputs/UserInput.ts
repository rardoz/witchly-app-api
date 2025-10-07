import { IsEmail } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import {
  BaseProfileFields,
  VALIDATION_CONSTANTS,
} from '../../shared/profile.schema';
@InputType()
export class CreateUserInput extends BaseProfileFields {
  @Field()
  @IsEmail({}, { message: VALIDATION_CONSTANTS.EMAIL.message })
  email: string;

  @Field({ nullable: true })
  handle?: string;
}

@InputType()
export class UpdateUserInput extends BaseProfileFields {
  @Field({ nullable: true })
  @IsEmail({}, { message: VALIDATION_CONSTANTS.EMAIL.message })
  email?: string;

  @Field({ nullable: true })
  handle?: string;
}
