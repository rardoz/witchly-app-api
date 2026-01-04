import { Field, ID, ObjectType } from 'type-graphql';
import { Asset } from './AssetTypes';

@ObjectType()
export class HoroscopeSignType {
  @Field(() => ID)
  _id: unknown;

  @Field()
  sign!: string;

  @Field()
  status!: 'active' | 'paused' | 'deleted';

  @Field()
  signLocal!: string;

  @Field()
  locale!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  signDateStart?: number;

  @Field({ nullable: true })
  signDateEnd?: number;

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

@ObjectType()
export class HoroscopeSignsResponse {
  @Field(() => [HoroscopeSignType])
  records: HoroscopeSignType[];

  @Field(() => Number)
  totalCount: number;

  @Field(() => Number)
  limit: number;

  @Field(() => Number)
  offset: number;
}
