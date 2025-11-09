import 'reflect-metadata';
import { type Document, Types } from 'mongoose';
import { Arg, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { GraphQLContext } from '../../middleware/auth.middleware';
import { Chat, type IChat } from '../../models/Chat';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import {
  CreateChatInput,
  EmojiInput,
  UpdateChatInput,
} from '../inputs/ChatInput';
import { ChatResponse, ChatType, EmojiReaction } from '../types/ChatTypes';

@Resolver(() => ChatType)
export class ChatResolver {
  // Mutation: Create a chat message
  @Mutation(() => ChatResponse)
  async createChatMessage(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: CreateChatInput
  ): Promise<ChatResponse> {
    context.hasUserWriteAppWriteScope(context);

    // Validate message length
    if (!input.message || input.message.trim().length === 0) {
      throw new ValidationError('Message cannot be empty');
    }

    if (input.message.length > 5000) {
      throw new ValidationError(
        'Message exceeds maximum length of 5000 characters'
      );
    }

    // Create chat message
    const chat = new Chat({
      user: new Types.ObjectId(context.userId),
      message: input.message.trim(),
      asset: input.asset ? new Types.ObjectId(input.asset) : undefined,
      entityId: new Types.ObjectId(input.entityId),
      entityType: input.entityType.toLowerCase(),
      locale: input.locale,
      likes: [],
      emojis: {},
    });

    await chat.save();
    await chat.populate('user');
    await chat.populate('asset');

    return {
      success: true,
      message: 'Chat message created successfully',
      chat: this.transformChatToType(chat),
    };
  }

  // Mutation: Update a chat message
  @Mutation(() => ChatResponse)
  async updateChatMessage(
    @Ctx() context: GraphQLContext,
    @Arg('input') input: UpdateChatInput
  ): Promise<ChatResponse> {
    context.hasUserWriteAppWriteScope(context);

    const chat = await Chat.findById(input.id).populate('user');

    if (!chat) {
      throw new NotFoundError('Chat message not found');
    }

    // Only message owner or admin can update
    const isAdmin = context.hasUserScope('admin');
    const isOwner = chat.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to update this message'
      );
    }

    // Validate message
    if (!input.message || input.message.trim().length === 0) {
      throw new ValidationError('Message cannot be empty');
    }

    if (input.message.length > 5000) {
      throw new ValidationError(
        'Message exceeds maximum length of 5000 characters'
      );
    }

    chat.message = input.message.trim();
    if (input.asset !== undefined) {
      if (input.asset) {
        chat.asset = new Types.ObjectId(input.asset);
      } else {
        delete chat.asset;
      }
    }

    await chat.save();
    await chat.populate('user');
    await chat.populate('asset');

    return {
      success: true,
      message: 'Chat message updated successfully',
      chat: this.transformChatToType(chat),
    };
  }

  // Mutation: Delete a chat message
  @Mutation(() => ChatResponse)
  async deleteChatMessage(
    @Ctx() context: GraphQLContext,
    @Arg('id', () => ID) id: string
  ): Promise<ChatResponse> {
    context.hasUserWriteAppWriteScope(context);

    const chat = await Chat.findById(id).populate('user');

    if (!chat) {
      throw new NotFoundError('Chat message not found');
    }

    // Only message owner or admin can delete
    const isAdmin = context.hasUserScope('admin');
    const isOwner = chat.user._id.equals(new Types.ObjectId(context.userId));

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedError(
        'You do not have permission to delete this message'
      );
    }

    await Chat.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Chat message deleted successfully',
    };
  }

  // Mutation: Toggle like on a chat message
  @Mutation(() => ChatResponse)
  async toggleChatLike(
    @Ctx() context: GraphQLContext,
    @Arg('chatId', () => ID) chatId: string
  ): Promise<ChatResponse> {
    context.hasUserWriteAppWriteScope(context);

    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new NotFoundError('Chat message not found');
    }

    const userId = new Types.ObjectId(context.userId);
    const likeIndex = chat.likes.findIndex((id) => id.equals(userId));

    if (likeIndex > -1) {
      // Remove like
      chat.likes.splice(likeIndex, 1);
    } else {
      // Add like
      chat.likes.push(userId);
    }

    await chat.save();
    await chat.populate('user');
    await chat.populate('asset');

    return {
      success: true,
      message: likeIndex > -1 ? 'Like removed' : 'Like added',
      chat: this.transformChatToType(chat),
    };
  }

  // Mutation: Toggle emoji reaction on a chat message
  @Mutation(() => ChatResponse)
  async toggleChatEmoji(
    @Ctx() context: GraphQLContext,
    @Arg('chatId', () => ID) chatId: string,
    @Arg('emoji') emoji: EmojiInput
  ): Promise<ChatResponse> {
    context.hasUserWriteAppWriteScope(context);

    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new NotFoundError('Chat message not found');
    }

    // Validate emoji code format (should be Unicode code point like U+1F600)
    if (!emoji.emojiCode.match(/^U\+[0-9A-F]{4,6}$/i)) {
      throw new ValidationError(
        'Invalid emoji code format. Use format like U+1F600'
      );
    }

    const emojiCode = emoji.emojiCode.toUpperCase();
    const userId = `${context.userId}`;

    // Initialize emoji array if it doesn't exist
    if (!chat.emojis[emojiCode]) {
      chat.emojis[emojiCode] = [];
    }

    const userIndex = chat.emojis[emojiCode].indexOf(userId);

    if (userIndex > -1) {
      // Remove emoji reaction
      chat.emojis[emojiCode].splice(userIndex, 1);
      // Remove emoji code if no users have it
      if (chat.emojis[emojiCode].length === 0) {
        delete chat.emojis[emojiCode];
      }
    } else {
      // Add emoji reaction
      chat.emojis[emojiCode].push(userId);
    }

    chat.markModified('emojis');
    await chat.save();
    await chat.populate('user');
    await chat.populate('asset');

    return {
      success: true,
      message:
        userIndex > -1 ? 'Emoji reaction removed' : 'Emoji reaction added',
      chat: this.transformChatToType(chat),
    };
  }

  // Query: Get chat messages by entity
  @Query(() => [ChatType])
  async chatMessages(
    @Ctx() context: GraphQLContext,
    @Arg('entityId', () => ID) entityId: string,
    @Arg('entityType') entityType: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 })
    limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 })
    offset: number
  ): Promise<ChatType[]> {
    context.hasUserWriteAppWriteScope(context);

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    const messages = await Chat.find({
      entityId: new Types.ObjectId(entityId),
      entityType: entityType.toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user')
      .populate('asset');

    return messages.map((msg) => this.transformChatToType(msg));
  }

  // Helper method to transform Chat model to ChatType
  private transformChatToType(chat: IChat & Document): ChatType {
    const emojis: EmojiReaction[] = [];

    if (chat.emojis) {
      for (const [emojiCode, userIds] of Object.entries(chat.emojis)) {
        emojis.push({
          emojiCode,
          userIds: userIds as string[],
        });
      }
    }

    return {
      id: (chat._id as Types.ObjectId).toString(),
      user: chat.user,
      message: chat.message,
      asset: chat.asset,
      entityId: chat.entityId.toString(),
      entityType: chat.entityType,
      likes: chat.likes.map((id: Types.ObjectId) => id.toString()),
      emojis,
      locale: chat.locale,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    } as unknown as ChatType;
  }
}
