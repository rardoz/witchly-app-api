import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateHoroscopeSignInput {
  @Field()
  sign!: string;

  @Field()
  signLocal!: string;

  @Field()
  locale!: string;

  @Field({ nullable: true, defaultValue: 'active' })
  status: 'active' | 'paused' | 'deleted';

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  signDateStart?: number;

  @Field({ nullable: true })
  signDateEnd?: number;

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
  status?: 'active' | 'paused' | 'deleted';

  @Field({ nullable: true })
  signLocal?: string;

  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  signDateStart?: number;

  @Field({ nullable: true })
  signDateEnd?: number;

  @Field({ nullable: true })
  asset?: string;

  @Field({ nullable: true })
  title?: string;
}
