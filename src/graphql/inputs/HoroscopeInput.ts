import { Field, ID, InputType } from 'type-graphql';

@InputType()
export class CreateHoroscopeInput {
  @Field()
  locale: string;

  @Field()
  horoscopeDate: Date;

  @Field()
  horoscopeText: string;

  @Field()
  sign: string;

  @Field({ defaultValue: 'pending' })
  status: string;

  @Field(() => ID)
  user: string;
}

@InputType()
export class UpdateHoroscopeInput {
  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  horoscopeDate?: Date;

  @Field({ nullable: true })
  horoscopeText?: string;

  @Field({ nullable: true })
  sign?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => ID, { nullable: true })
  user?: string;
}
