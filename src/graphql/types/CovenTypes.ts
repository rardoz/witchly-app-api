import 'reflect-metadata';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class CovenType {
  @Field(() => ID)
  id: string;

  @Field()
  locale: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field()
  privacy: string;

  @Field()
  status: string;

  @Field(() => ID, { nullable: true })
  spellbookId?: string;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  backgroundAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  headerAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  avatarAsset?: Asset;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  secondaryColor?: string;

  @Field({ nullable: true })
  font?: string;

  @Field(() => User)
  user: User;

  @Field({ nullable: true })
  tradition?: string;

  @Field({ nullable: true })
  structure?: string;

  @Field({ nullable: true })
  practice?: string;

  @Field(() => Int, { nullable: true })
  maxMembers?: number;

  @Field(() => ID, { nullable: true })
  rosterId?: string;

  @Field({ nullable: true })
  webUrl?: string;

  @Field({ nullable: true })
  webUrlLabel?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class CovenRosterType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  coven: string;

  @Field(() => User)
  user: User;

  @Field({ nullable: true })
  userTitle?: string;

  @Field()
  userRole: string;

  @Field(() => Asset, { nullable: true })
  avatarAsset?: Asset;

  @Field({ nullable: true })
  userCovenName?: string;

  @Field({ nullable: true })
  userCovenBio?: string;

  @Field({ nullable: true })
  lastActive?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// Response types for mutations
@ObjectType()
export class CovenResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => CovenType, { nullable: true })
  coven?: CovenType;
}

@ObjectType()
export class CovenRosterResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => CovenRosterType, { nullable: true })
  rosterEntry?: CovenRosterType;
}
