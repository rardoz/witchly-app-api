import { Field, ID, ObjectType } from 'type-graphql';
import { User } from './User';
// Removed UserType import as it is no longer used

@ObjectType()
export class HoroscopeType {
  @Field(() => ID)
  _id: unknown;

  @Field()
  locale: string;

  @Field()
  horoscopeDate: Date;

  @Field()
  horoscopeText: string;

  @Field()
  sign: string;

  @Field()
  status: string;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class CreateHoroscopeResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => HoroscopeType, { nullable: true })
  horoscope?: HoroscopeType;
}

@ObjectType()
export class UpdateHoroscopeResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => HoroscopeType, { nullable: true })
  horoscope?: HoroscopeType;
}

@ObjectType()
export class DeleteHoroscopeResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
