interface PlainHoroscope {
  _id: unknown;
  locale: string;
  horoscopeDate: Date;
  horoscopeText: string;
  sign: string;
  status: string;
  user: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Horoscope } from '../../models/Horoscope';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  CreateHoroscopeInput,
  UpdateHoroscopeInput,
} from '../inputs/HoroscopeInput';
import {
  CreateHoroscopeResponse,
  DeleteHoroscopeResponse,
  HoroscopeType,
  UpdateHoroscopeResponse,
} from '../types/HoroscopeTypes';

@Resolver(() => HoroscopeType)
export class HoroscopeResolver {
  @Mutation(() => CreateHoroscopeResponse)
  async createHoroscope(
    @Ctx() context: GraphQLContext,
    @Arg('input', () => CreateHoroscopeInput) input: CreateHoroscopeInput
  ): Promise<CreateHoroscopeResponse> {
    context.hasUserAdminWriteAppWriteScope(context);
    if (input.status && !['sent', 'pending'].includes(input.status)) {
      throw new ValidationError('Status must be either "sent" or "pending"');
    }
    try {
      const horoscope = new Horoscope({
        locale: input.locale,
        horoscopeDate: input.horoscopeDate,
        horoscopeText: input.horoscopeText,
        sign: input.sign,
        status: input.status || 'pending',
        user: input.user,
      });
      await horoscope.save();
      const plain = horoscope.toObject() as PlainHoroscope;
      return {
        success: true,
        message: 'Horoscope created successfully',
        horoscope: {
          ...plain,
          id: plain._id ? plain._id.toString() : '',
          user: plain.user ? plain.user.toString() : '',
          createdAt: plain.createdAt ?? new Date(0),
          updatedAt: plain.updatedAt ?? new Date(0),
        },
      };
    } catch (error) {
      console.error('Error creating horoscope:', error);
      throw new ValidationError(
        'Failed to create horoscope. Please check your input.'
      );
    }
  }

  @Mutation(() => UpdateHoroscopeResponse)
  async updateHoroscope(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input', () => UpdateHoroscopeInput) input: UpdateHoroscopeInput
  ): Promise<UpdateHoroscopeResponse> {
    context.hasUserAdminWriteAppWriteScope(context);
    const horoscope = await Horoscope.findById(id);
    if (!horoscope) {
      throw new NotFoundError('Horoscope not found');
    }
    if (input.status && !['sent', 'pending'].includes(input.status)) {
      throw new ValidationError('Status must be either "sent" or "pending"');
    }
    try {
      if (input.locale !== undefined) horoscope.locale = input.locale;
      if (input.horoscopeDate !== undefined)
        horoscope.horoscopeDate = input.horoscopeDate;
      if (input.horoscopeText !== undefined)
        horoscope.horoscopeText = input.horoscopeText;
      if (input.sign !== undefined) horoscope.sign = input.sign;
      if (
        input.status !== undefined &&
        (input.status === 'sent' || input.status === 'pending')
      )
        horoscope.status = input.status;
      if (input.user !== undefined) {
        // Convert string to ObjectId
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Types } = require('mongoose');
        horoscope.user = new Types.ObjectId(input.user);
      }
      await horoscope.save();
      const plain = horoscope.toObject() as PlainHoroscope;
      return {
        success: true,
        message: 'Horoscope updated successfully',
        horoscope: {
          ...plain,
          id: plain._id ? plain._id.toString() : '',
          user: plain.user ? plain.user.toString() : '',
          createdAt: plain.createdAt ?? new Date(0),
          updatedAt: plain.updatedAt ?? new Date(0),
        },
      };
    } catch (error) {
      console.error('Error updating horoscope:', error);
      throw new ValidationError(
        'Failed to update horoscope. Please check your input.'
      );
    }
  }

  @Mutation(() => DeleteHoroscopeResponse)
  async deleteHoroscope(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteHoroscopeResponse> {
    context.hasUserAdminWriteAppWriteScope(context);
    const horoscope = await Horoscope.findById(id);
    if (!horoscope) {
      throw new NotFoundError('Horoscope not found');
    }
    try {
      await Horoscope.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Horoscope deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting horoscope:', error);
      throw new ValidationError('Failed to delete horoscope');
    }
  }

  @Query(() => [HoroscopeType])
  async horoscopes(
    @Ctx() context: GraphQLContext,
    @Arg('sign', () => String, { nullable: true }) sign?: string,
    @Arg('horoscopeDate', () => Date, { nullable: true }) horoscopeDate?: Date,
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number = 10,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number = 0
  ): Promise<HoroscopeType[]> {
    context.hasUserAdminWriteAppWriteScope(context);
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }
    const filter: Record<string, unknown> = {};
    if (sign) filter.sign = sign;
    if (horoscopeDate) filter.horoscopeDate = horoscopeDate;
    if (status) filter.status = status;
    const horoscopes = await Horoscope.find(filter)
      .sort({ horoscopeDate: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user');
    return horoscopes.map((doc) => {
      const plain = doc.toObject() as PlainHoroscope;
      return {
        ...plain,
        id: plain._id ? plain._id.toString() : '',
        user: plain.user ? plain.user.toString() : '',
        createdAt: plain.createdAt ?? new Date(0),
        updatedAt: plain.updatedAt ?? new Date(0),
      };
    });
  }
  // End of HoroscopeResolver
}
