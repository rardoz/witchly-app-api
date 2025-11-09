import 'reflect-metadata';
import { Field, ID, InputType } from 'type-graphql';

// Event inputs
@InputType()
export class CreateEventInput {
  @Field()
  startDateTime: Date;

  @Field({ defaultValue: 'UTC' })
  startTimezone: string;

  @Field()
  endDateTime: Date;

  @Field({ defaultValue: 'UTC' })
  endTimezone: string;

  @Field(() => ID)
  entityId: string;

  @Field()
  entityType: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => ID, { nullable: true })
  heroAsset?: string;

  @Field(() => ID, { nullable: true })
  backgroundAsset?: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  webUrl?: string;

  @Field({ nullable: true })
  webUrlLabel?: string;
}

@InputType()
export class UpdateEventInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  startDateTime?: Date;

  @Field({ nullable: true })
  startTimezone?: string;

  @Field({ nullable: true })
  endDateTime?: Date;

  @Field({ nullable: true })
  endTimezone?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => ID, { nullable: true })
  heroAsset?: string;

  @Field(() => ID, { nullable: true })
  backgroundAsset?: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  webUrl?: string;

  @Field({ nullable: true })
  webUrlLabel?: string;
}
