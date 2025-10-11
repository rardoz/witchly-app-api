import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class TarotDeckType {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  primaryImageUrl?: string;

  @Field({ nullable: true })
  cardBackgroundUrl?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  author?: string;

  @Field(() => [String], { nullable: true })
  meta?: string[];

  @Field({ nullable: true })
  layoutType?: string;

  @Field({ nullable: true })
  layoutCount?: number;

  @Field()
  status!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class CreateTarotDeckResponse extends TarotDeckType {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}

@ObjectType()
export class UpdateTarotDeckResponse extends TarotDeckType {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}

@ObjectType()
export class DeleteTarotDeckResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}
