import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class EventType {
  @Field(() => ID)
  id: string;

  @Field()
  startDateTime: Date;

  @Field()
  startTimezone: string;

  @Field()
  endDateTime: Date;

  @Field()
  endTimezone: string;

  @Field(() => User)
  user: User;

  @Field(() => ID)
  entityId: string;

  @Field()
  entityType: string;

  @Field(() => [ID])
  rsvpUsers: string[];

  @Field(() => [ID])
  interestedUsers: string[];

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  shortDescription?: string;

  @Field(() => Asset, { nullable: true })
  heroAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  backgroundAsset?: Asset;

  @Field(() => Asset, { nullable: true })
  primaryAsset?: Asset;

  @Field({ nullable: true })
  primaryColor?: string;

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
export class EventResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => EventType, { nullable: true })
  event?: EventType;
}
