import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';
import { User } from './User';

@ObjectType()
export class EmojiReaction {
  @Field()
  emojiCode: string;

  @Field(() => [ID])
  userIds: string[];
}

@ObjectType()
export class ChatType {
  @Field(() => ID)
  id: string;

  @Field(() => User)
  user: User;

  @Field()
  message: string;

  @Field(() => Asset, { nullable: true })
  asset?: Asset;

  @Field(() => ID)
  entityId: string;

  @Field()
  entityType: string;

  @Field(() => [ID])
  likes: string[];

  @Field(() => [EmojiReaction])
  emojis: EmojiReaction[];

  @Field()
  locale: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class ChatResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => ChatType, { nullable: true })
  chat?: ChatType;
}
