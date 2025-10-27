import { Horoscope } from '../models/Horoscope';
import { IUser, User } from '../models/User';

describe('HoroscopeResolver', () => {
  let testUser: IUser;

  beforeAll(async () => {
    // Create a test user and get access token (mock or use fixtures)
    testUser = await User.create({
      email: 'testuser@example.com',
      userType: 'basic',
      emailVerified: true,
      handle: 'testuser',
    });
  });

  afterAll(async () => {
    await Horoscope.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a horoscope', async () => {
    const mutation = `
      mutation {
        createHoroscope(input: {
          locale: "en",
          horoscopeDate: "2025-10-27T00:00:00.000Z",
          horoscopeText: "You will have a great day!",
          sign: "aries",
          status: "pending",
          user: "${testUser.id}"
        }) {
          success
          message
          horoscope {
            id
            sign
            status
            user
          }
        }
      }
    `;
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation });
    expect(res.body.data.createHoroscope.success).toBe(true);
    expect(res.body.data.createHoroscope.horoscope.sign).toBe('aries');
  });

  it('should get horoscopes with filter', async () => {
    const query = `
      query {
        horoscopes(sign: "aries", status: "pending", limit: 5, offset: 0) {
          id
          sign
          status
          user
        }
      }
    `;
    const res = await global.adminUserAdminAppTestRequest().send({ query });
    expect(res.body.data.horoscopes.length).toBeGreaterThan(0);
    expect(res.body.data.horoscopes[0].sign).toBe('aries');
  });

  it('should update a horoscope', async () => {
    const horoscope = await Horoscope.findOne({ sign: 'aries' });
    expect(horoscope).not.toBeNull();
    if (!horoscope) throw new Error('Horoscope not found for update test');
    const mutation = `
      mutation {
        updateHoroscope(id: "${horoscope.id}", input: { status: "sent" }) {
          success
          message
          horoscope {
            id
            status
          }
        }
      }
    `;
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation });
    expect(res.body.data.updateHoroscope.success).toBe(true);
    expect(res.body.data.updateHoroscope.horoscope.status).toBe('sent');
  });

  it('should delete a horoscope', async () => {
    const horoscope = await Horoscope.findOne({ sign: 'aries' });
    expect(horoscope).not.toBeNull();
    if (!horoscope) throw new Error('Horoscope not found for delete test');
    const mutation = `
      mutation {
        deleteHoroscope(id: "${horoscope.id}") {
          success
          message
        }
      }
    `;
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation });
    expect(res.body.data.deleteHoroscope.success).toBe(true);
  });
});
