// Removed PlainHoroscopeSign and PlainHoroscope interfaces; use HoroscopeSignType and HoroscopeType instead

import { Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';

import { GraphQLContext } from '../../middleware/auth.middleware';
import { Horoscope } from '../../models/Horoscope';
import { HoroscopeSign } from '../../models/HoroscopeSign';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  CreateHoroscopeInput,
  UpdateHoroscopeInput,
} from '../inputs/HoroscopeInput';
import {
  CreateHoroscopeSignInput,
  UpdateHoroscopeSignInput,
} from '../inputs/HoroscopeSignInput';
import {
  CreateHoroscopeSignResponse,
  DeleteHoroscopeSignResponse,
  HoroscopeSignsResponse,
  HoroscopeSignType,
  UpdateHoroscopeSignResponse,
} from '../types/HoroscopeSignTypes';
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
        user: new Types.ObjectId(context.userId),
      });
      await horoscope.save();
      await horoscope.populate('user');
      return {
        success: true,
        message: 'Horoscope created successfully',
        horoscope: horoscope as unknown as HoroscopeType,
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

      horoscope.user = new Types.ObjectId(context.userId);
      await horoscope.save();
      await horoscope.populate('user');
      return {
        success: true,
        message: 'Horoscope updated successfully',
        horoscope: horoscope as unknown as HoroscopeType,
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
    context.hasUserReadAppReadScope(context);
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
    return horoscopes as unknown as HoroscopeType[];
  }
  // --- Horoscope Sign Endpoints ---

  @Mutation(() => CreateHoroscopeSignResponse)
  async createHoroscopeSign(
    @Ctx() context: GraphQLContext,
    @Arg('input', () => CreateHoroscopeSignInput)
    input: CreateHoroscopeSignInput
  ): Promise<CreateHoroscopeSignResponse> {
    context.hasUserAdminWriteAppWriteScope(context);
    if (!input.sign || !input.locale) {
      throw new ValidationError('Sign and locale are required');
    }
    // Enforce uniqueness of sign+locale
    const existing = await HoroscopeSign.findOne({
      sign: input.sign,
      locale: input.locale,
    });
    if (existing) {
      throw new ValidationError('Sign and locale combination must be unique');
    }
    try {
      const signDoc = new HoroscopeSign(input);
      await signDoc.save();
      await signDoc.populate('asset');
      return {
        success: true,
        message: 'Horoscope sign created successfully',
        sign: signDoc as unknown as HoroscopeSignType,
      };
    } catch (error) {
      console.error('Error creating horoscope sign:', error);
      throw new ValidationError('Failed to create horoscope sign');
    }
  }

  @Query(() => HoroscopeSignsResponse)
  async getHoroscopeSigns(
    @Ctx() context: GraphQLContext,
    @Arg('locale', () => String, { nullable: true }) locale?: string,
    @Arg('sign', () => String, { nullable: true }) sign?: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number = 10,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number = 0
  ): Promise<HoroscopeSignsResponse> {
    context.hasUserReadAppReadScope(context);
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }
    const filter: Record<string, unknown> = {};
    if (locale) filter.locale = locale;
    if (sign) filter.sign = { $regex: sign, $options: 'i' };

    const [signs, totalCount] = await Promise.all([
      await HoroscopeSign.find(filter)
        .sort({ sign: 1 })
        .skip(offset)
        .limit(limit)
        .populate('asset'),
      HoroscopeSign.countDocuments(filter),
    ]);

    return {
      records: signs as unknown as HoroscopeSignType[],
      totalCount,
      limit,
      offset,
    };
  }

  @Mutation(() => DeleteHoroscopeSignResponse)
  async deleteHoroscopeSign(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<DeleteHoroscopeSignResponse> {
    context.hasUserAdminWriteAppWriteScope(context);
    const signDoc = await HoroscopeSign.findById(id);
    if (!signDoc) {
      throw new NotFoundError('Horoscope sign not found');
    }
    try {
      await HoroscopeSign.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Horoscope sign deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting horoscope sign:', error);
      throw new ValidationError('Failed to delete horoscope sign');
    }
  }

  @Mutation(() => UpdateHoroscopeSignResponse)
  async updateHoroscopeSign(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string,
    @Arg('input', () => UpdateHoroscopeSignInput)
    input: UpdateHoroscopeSignInput
  ): Promise<UpdateHoroscopeSignResponse> {
    context.hasUserAdminWriteAppWriteScope(context);
    const signDoc = await HoroscopeSign.findById(id);
    if (!signDoc) {
      throw new NotFoundError('Horoscope sign not found');
    }
    // If updating sign+locale, enforce uniqueness
    if (input.sign && input.locale) {
      const existing = await HoroscopeSign.findOne({
        sign: input.sign,
        locale: input.locale,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ValidationError('Sign and locale combination must be unique');
      }
    }
    try {
      if (input.sign !== undefined) signDoc.sign = input.sign;
      if (input.locale !== undefined) signDoc.locale = input.locale;
      if (input.description !== undefined)
        signDoc.description = input.description;
      if (input.signDateStart !== undefined)
        signDoc.signDateStart = input.signDateStart;
      if (input.signDateEnd !== undefined)
        signDoc.signDateEnd = input.signDateEnd;
      if (input.asset !== undefined)
        signDoc.asset = new Types.ObjectId(input.asset);
      if (input.title !== undefined) signDoc.title = input.title;
      await signDoc.save();
      await signDoc.populate('asset');
      return {
        success: true,
        message: 'Horoscope sign updated successfully',
        sign: signDoc as unknown as HoroscopeSignType,
      };
    } catch (error) {
      console.error('Error updating horoscope sign:', error);
      throw new ValidationError('Failed to update horoscope sign');
    }
  }
}
