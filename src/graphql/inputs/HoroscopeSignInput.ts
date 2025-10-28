import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateHoroscopeSignInput {
  @Field()
  sign!: string;

  @Field()
  locale!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  signDateStart?: Date;

  @Field({ nullable: true })
  signDateEnd?: Date;

  @Field({ nullable: true })
  asset?: string;

  @Field({ nullable: true })
  title?: string;
}

@InputType()
export class UpdateHoroscopeSignInput {
  @Field({ nullable: true })
  sign?: string;

  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  signDateStart?: Date;

  @Field({ nullable: true })
  signDateEnd?: Date;

  @Field({ nullable: true })
  asset?: string;

  @Field({ nullable: true })
  title?: string;
}
