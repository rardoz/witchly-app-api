import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateUserInput {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  userType: string;

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

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  userType?: string;

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
