import 'reflect-metadata';
import { Field, ID, InputType, Int } from 'type-graphql';

// Coven inputs
@InputType()
export class CreateCovenInput {
  @Field({ defaultValue: 'en-US' })
  locale: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field({ defaultValue: 'public' })
  privacy: string;

  @Field(() => ID, { nullable: true })
  spellbookId?: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  backgroundAsset?: string;

  @Field(() => ID, { nullable: true })
  headerAsset?: string;

  @Field(() => ID, { nullable: true })
  avatarAsset?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  secondaryColor?: string;

  @Field({ nullable: true })
  font?: string;

  @Field({ nullable: true })
  tradition?: string;

  @Field({ nullable: true })
  structure?: string;

  @Field({ nullable: true })
  practice?: string;

  @Field(() => Int, { nullable: true })
  maxMembers?: number;

  @Field({ nullable: true })
  webUrl?: string;

  @Field({ nullable: true })
  webUrlLabel?: string;

  @Field({ nullable: true, defaultValue: 'active' })
  status: string;
}

@InputType()
export class UpdateCovenInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  locale?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field({ nullable: true })
  privacy?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => ID, { nullable: true })
  spellbookId?: string;

  @Field(() => ID, { nullable: true })
  primaryAsset?: string;

  @Field(() => ID, { nullable: true })
  backgroundAsset?: string;

  @Field(() => ID, { nullable: true })
  headerAsset?: string;

  @Field(() => ID, { nullable: true })
  avatarAsset?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  secondaryColor?: string;

  @Field({ nullable: true })
  font?: string;

  @Field({ nullable: true })
  tradition?: string;

  @Field({ nullable: true })
  structure?: string;

  @Field({ nullable: true })
  practice?: string;

  @Field(() => Int, { nullable: true })
  maxMembers?: number;

  @Field({ nullable: true })
  webUrl?: string;

  @Field({ nullable: true })
  webUrlLabel?: string;
}

// CovenRoster inputs
@InputType()
export class UpdateCovenRosterInput {
  @Field(() => ID)
  covenId: string;

  @Field(() => ID)
  userId: string;

  @Field({ nullable: true })
  userTitle?: string;

  @Field({ nullable: true })
  userRole?: string;

  @Field(() => ID, { nullable: true })
  avatarAsset?: string;

  @Field({ nullable: true })
  userCovenName?: string;

  @Field({ nullable: true })
  userCovenBio?: string;
}
