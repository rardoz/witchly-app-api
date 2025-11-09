import 'reflect-metadata';
import { Field, ID, InputType } from 'type-graphql';

// Chat inputs
@InputType()
export class CreateChatInput {
  @Field()
  message: string;

  @Field(() => ID, { nullable: true })
  asset?: string;

  @Field(() => ID)
  entityId: string;

  @Field()
  entityType: string;

  @Field({ defaultValue: 'en-US' })
  locale: string;
}

@InputType()
export class UpdateChatInput {
  @Field(() => ID)
  id: string;

  @Field()
  message: string;

  @Field(() => ID, { nullable: true })
  asset?: string;
}

@InputType()
export class EmojiInput {
  @Field()
  emojiCode: string;
}
