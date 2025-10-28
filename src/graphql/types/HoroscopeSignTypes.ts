import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';

@ObjectType()
export class HoroscopeSignType {
  @Field(() => ID)
  _id: unknown;

  @Field()
  sign!: string;

  @Field()
  locale!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  signDateStart?: Date;

  @Field({ nullable: true })
  signDateEnd?: Date;

  @Field({ nullable: true })
  imageAsset?: string;

  @Field({ nullable: true })
  title?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => Asset, { nullable: true })
  asset?: Asset;
}

@ObjectType()
export class CreateHoroscopeSignResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => HoroscopeSignType, { nullable: true })
  sign?: HoroscopeSignType;
}

@ObjectType()
export class UpdateHoroscopeSignResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => HoroscopeSignType, { nullable: true })
  sign?: HoroscopeSignType;
}

@ObjectType()
export class DeleteHoroscopeSignResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}
