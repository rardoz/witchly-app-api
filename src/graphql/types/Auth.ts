import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AuthenticateResponse {
  @Field()
  access_token!: string;

  @Field()
  token_type!: string;

  @Field()
  expires_in!: number;

  @Field()
  scope!: string;

  @Field({ nullable: true })
  refresh_token?: string;
}
