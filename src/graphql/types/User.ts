import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  userType: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  profileImageUrl?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  shortBio?: string;

  @Field({ nullable: true })
  handle?: string;

  @Field({ nullable: true })
  backdropImageUrl?: string;

  @Field({ nullable: true })
  instagramHandle?: string;

  @Field({ nullable: true })
  tikTokHandle?: string;

  @Field({ nullable: true })
  twitterHandle?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  @Field({ nullable: true })
  facebookUrl?: string;

  @Field({ nullable: true })
  snapchatHandle?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field({ nullable: true })
  sign?: string;

  @Field({ nullable: true })
  sex?: string;
}
