import { Types } from 'mongoose';
import { Chat } from '../models/Chat';
import { Coven } from '../models/Coven';

describe('ChatResolver GraphQL Endpoints', () => {
  let testCovenId: string;
  let testChatId: string;

  beforeAll(async () => {
    // Create test coven for entity linking
    const coven = await Coven.create({
      name: 'Chat Test Coven',
      privacy: 'public',
      status: 'active',
      user: global.adminUserId,
    });
    testCovenId = (coven._id as Types.ObjectId).toString();

    // Create test chat message
    const chat = await Chat.create({
      user: global.adminUserId,
      message: 'Test chat message',
      entityId: coven._id,
      entityType: 'coven',
      locale: 'en-US',
      likes: [],
      emojis: {},
    });
    testChatId = (chat._id as Types.ObjectId).toString();
  });

  describe('Mutation: createChatMessage', () => {
    it('should create a chat message', async () => {
      const mutation = `
        mutation CreateChatMessage($input: CreateChatInput!) {
          createChatMessage(input: $input) {
            success
            message
            chat {
              id
              message
              entityId
              entityType
              locale
              user {
                id
              }
              likes
              emojis {
                emojiCode
                userIds
              }
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            message: 'Hello from basic user!',
            entityId: testCovenId,
            entityType: 'coven',
            locale: 'en-US',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createChatMessage.success).toBe(true);
      expect(response.body.data.createChatMessage.chat.message).toBe(
        'Hello from basic user!'
      );
      expect(response.body.data.createChatMessage.chat.entityType).toBe(
        'coven'
      );
      expect(response.body.data.createChatMessage.chat.user.id).toBe(
        global.basicUserId
      );
      expect(response.body.data.createChatMessage.chat.likes).toEqual([]);
      expect(response.body.data.createChatMessage.chat.emojis).toEqual([]);
    });

    it('should create a chat message with asset', async () => {
      const mutation = `
        mutation CreateChatMessage($input: CreateChatInput!) {
          createChatMessage(input: $input) {
            success
            chat {
              message
              asset {
                id
              }
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            message: 'Message with asset',
            asset: '68ff7ebe04e43ae41ca0fc59',
            entityId: testCovenId,
            entityType: 'coven',
            locale: 'en-US',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.createChatMessage.success).toBe(true);
      expect(response.body.data.createChatMessage.chat.asset).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const mutation = `
        mutation CreateChatMessage($input: CreateChatInput!) {
          createChatMessage(input: $input) {
            success
          }
        }
      `;

      const response = await global.testRequest.post('/graphql').send({
        query: mutation,
        variables: {
          input: {
            message: 'Unauthenticated message',
            entityId: testCovenId,
            entityType: 'coven',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate empty message', async () => {
      const mutation = `
        mutation CreateChatMessage($input: CreateChatInput!) {
          createChatMessage(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            message: '   ',
            entityId: testCovenId,
            entityType: 'coven',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain('cannot be empty');
    });

    it('should validate message length', async () => {
      const mutation = `
        mutation CreateChatMessage($input: CreateChatInput!) {
          createChatMessage(input: $input) {
            success
          }
        }
      `;

      const longMessage = 'a'.repeat(5001);

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            message: longMessage,
            entityId: testCovenId,
            entityType: 'coven',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'exceeds maximum length'
      );
    });
  });

  describe('Mutation: updateChatMessage', () => {
    it('should allow owner to update their message', async () => {
      const chat = await Chat.create({
        user: global.basicUserId,
        message: 'Original message',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
      });

      const mutation = `
        mutation UpdateChatMessage($input: UpdateChatInput!) {
          updateChatMessage(input: $input) {
            success
            message
            chat {
              id
              message
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: (chat._id as Types.ObjectId).toString(),
            message: 'Updated message',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateChatMessage.success).toBe(true);
      expect(response.body.data.updateChatMessage.chat.message).toBe(
        'Updated message'
      );
    });

    it('should allow admin to update any message', async () => {
      const chat = await Chat.create({
        user: global.basicUserId,
        message: 'Basic user message',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
      });

      const mutation = `
        mutation UpdateChatMessage($input: UpdateChatInput!) {
          updateChatMessage(input: $input) {
            success
            chat {
              message
            }
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: (chat._id as Types.ObjectId).toString(),
            message: 'Admin updated message',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.updateChatMessage.success).toBe(true);
    });

    it('should not allow non-owner to update message', async () => {
      const mutation = `
        mutation UpdateChatMessage($input: UpdateChatInput!) {
          updateChatMessage(input: $input) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          input: {
            id: testChatId, // Admin's message
            message: 'Unauthorized update',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: deleteChatMessage', () => {
    it('should allow owner to delete their message', async () => {
      const chat = await Chat.create({
        user: global.basicUserId,
        message: 'Message to delete',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
      });

      const mutation = `
        mutation DeleteChatMessage($id: ID!) {
          deleteChatMessage(id: $id) {
            success
            message
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: (chat._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteChatMessage.success).toBe(true);

      const deleted = await Chat.findById(chat._id);
      expect(deleted).toBeNull();
    });

    it('should not allow non-owner to delete message', async () => {
      const mutation = `
        mutation DeleteChatMessage($id: ID!) {
          deleteChatMessage(id: $id) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          id: testChatId, // Admin's message
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Mutation: toggleChatLike', () => {
    it('should add like to message', async () => {
      const chat = await Chat.create({
        user: global.adminUserId,
        message: 'Likeable message',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
        likes: [],
      });

      const mutation = `
        mutation ToggleChatLike($chatId: ID!) {
          toggleChatLike(chatId: $chatId) {
            success
            message
            chat {
              id
              likes
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          chatId: (chat._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.toggleChatLike.success).toBe(true);
      expect(response.body.data.toggleChatLike.message).toBe('Like added');
      expect(response.body.data.toggleChatLike.chat.likes).toContain(
        global.basicUserId
      );
    });

    it('should remove like from message', async () => {
      const chat = await Chat.create({
        user: global.adminUserId,
        message: 'Liked message',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
        likes: [new Types.ObjectId(global.basicUserId)],
      });

      const mutation = `
        mutation ToggleChatLike($chatId: ID!) {
          toggleChatLike(chatId: $chatId) {
            success
            message
            chat {
              likes
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          chatId: (chat._id as Types.ObjectId).toString(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.toggleChatLike.message).toBe('Like removed');
      expect(response.body.data.toggleChatLike.chat.likes).not.toContain(
        global.basicUserId
      );
    });
  });

  describe('Mutation: toggleChatEmoji', () => {
    it('should add emoji reaction to message', async () => {
      const chat = await Chat.create({
        user: global.adminUserId,
        message: 'Message for emoji',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
        emojis: {},
      });

      const mutation = `
        mutation ToggleChatEmoji($chatId: ID!, $emoji: EmojiInput!) {
          toggleChatEmoji(chatId: $chatId, emoji: $emoji) {
            success
            message
            chat {
              id
              emojis {
                emojiCode
                userIds
              }
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          chatId: (chat._id as Types.ObjectId).toString(),
          emoji: {
            emojiCode: 'U+1F600',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.toggleChatEmoji.success).toBe(true);
      expect(response.body.data.toggleChatEmoji.message).toBe(
        'Emoji reaction added'
      );
      expect(response.body.data.toggleChatEmoji.chat.emojis).toHaveLength(1);
      expect(response.body.data.toggleChatEmoji.chat.emojis[0].emojiCode).toBe(
        'U+1F600'
      );
      expect(
        response.body.data.toggleChatEmoji.chat.emojis[0].userIds
      ).toContain(global.basicUserId);
    });

    it('should remove emoji reaction from message', async () => {
      const chat = await Chat.create({
        user: global.adminUserId,
        message: 'Message with emoji',
        entityId: new Types.ObjectId(testCovenId),
        entityType: 'coven',
        locale: 'en-US',
        emojis: {
          'U+1F600': [global.basicUserId],
        },
      });

      const mutation = `
        mutation ToggleChatEmoji($chatId: ID!, $emoji: EmojiInput!) {
          toggleChatEmoji(chatId: $chatId, emoji: $emoji) {
            success
            message
            chat {
              emojis {
                emojiCode
                userIds
              }
            }
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          chatId: (chat._id as Types.ObjectId).toString(),
          emoji: {
            emojiCode: 'U+1F600',
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.toggleChatEmoji.message).toBe(
        'Emoji reaction removed'
      );
      expect(response.body.data.toggleChatEmoji.chat.emojis).toHaveLength(0);
    });

    it('should validate emoji code format', async () => {
      const mutation = `
        mutation ToggleChatEmoji($chatId: ID!, $emoji: EmojiInput!) {
          toggleChatEmoji(chatId: $chatId, emoji: $emoji) {
            success
          }
        }
      `;

      const response = await global.basicUserBasicAppTestRequest().send({
        query: mutation,
        variables: {
          chatId: testChatId,
          emoji: {
            emojiCode: 'invalid',
          },
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors[0].message).toContain(
        'Invalid emoji code format'
      );
    });
  });

  describe('Query: chatMessages', () => {
    beforeAll(async () => {
      // Create multiple messages
      await Chat.create([
        {
          user: global.adminUserId,
          message: 'First message',
          entityId: new Types.ObjectId(testCovenId),
          entityType: 'coven',
          locale: 'en-US',
        },
        {
          user: global.basicUserId,
          message: 'Second message',
          entityId: new Types.ObjectId(testCovenId),
          entityType: 'coven',
          locale: 'en-US',
        },
        {
          user: global.adminUserId,
          message: 'Third message',
          entityId: new Types.ObjectId(testCovenId),
          entityType: 'coven',
          locale: 'en-US',
        },
      ]);
    });

    it('should get chat messages by entity', async () => {
      const query = `
        query GetChatMessages($entityId: ID!, $entityType: String!, $limit: Int, $offset: Int) {
          chatMessages(entityId: $entityId, entityType: $entityType, limit: $limit, offset: $offset) {
            id
            message
            entityId
            entityType
            user {
              id
              handle
            }
            likes
            emojis {
              emojiCode
              userIds
            }
            createdAt
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          entityId: testCovenId,
          entityType: 'coven',
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.chatMessages).toBeDefined();
      expect(Array.isArray(response.body.data.chatMessages)).toBe(true);
      expect(response.body.data.chatMessages.length).toBeGreaterThan(0);
      expect(
        response.body.data.chatMessages.every(
          (m: any) => m.entityType === 'coven'
        )
      ).toBe(true);
    });

    it('should respect pagination', async () => {
      const query = `
        query GetChatMessages($entityId: ID!, $entityType: String!, $limit: Int, $offset: Int) {
          chatMessages(entityId: $entityId, entityType: $entityType, limit: $limit, offset: $offset) {
            id
            message
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          entityId: testCovenId,
          entityType: 'coven',
          limit: 2,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.chatMessages.length).toBeLessThanOrEqual(2);
    });

    it('should validate pagination limits', async () => {
      const query = `
        query GetChatMessages($entityId: ID!, $entityType: String!, $limit: Int) {
          chatMessages(entityId: $entityId, entityType: $entityType, limit: $limit) {
            id
          }
        }
      `;

      const response = await global.adminUserAdminAppTestRequest().send({
        query,
        variables: {
          entityId: testCovenId,
          entityType: 'coven',
          limit: 200,
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });
});
