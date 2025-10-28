import { Horoscope } from '../models/Horoscope';

describe('HoroscopeResolver', () => {
  async function _createHoroscope() {
    const mutation = `
      mutation {
        createHoroscope(input: {
          locale: "en",
          horoscopeDate: "2025-10-27T00:00:00.000Z",
          horoscopeText: "You will have a great day!",
          sign: "aries",
          status: "pending"
        }) {
          success
          message
          horoscope {
            _id
            sign
            status
            user {
             id
            }
          }
        }
      }
    `;
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation });
    return res;
  }
  it('should create a horoscope', async () => {
    const res = await _createHoroscope();
    expect(res.body.data.createHoroscope.success).toBe(true);
    expect(res.body.data.createHoroscope.horoscope.sign).toBe('aries');
    expect(res.body.data.createHoroscope.horoscope.user.id).toBe(
      global.adminUserId
    );
  });

  it('should get horoscopes with filter', async () => {
    await _createHoroscope();
    const query = `
      query {
        horoscopes(sign: "aries", status: "pending", limit: 5, offset: 0) {
          _id
          sign
          status
          user {
            id
          }
        }
      }
    `;
    const res = await global.adminUserAdminAppTestRequest().send({ query });
    expect(res.body.data.horoscopes.length).toBeGreaterThan(0);
    expect(res.body.data.horoscopes[0].user.id).toBe(global.adminUserId);
  });

  it('should update a horoscope', async () => {
    await _createHoroscope();
    const horoscope = await Horoscope.findOne({ sign: 'aries' });
    expect(horoscope).not.toBeNull();
    const mutation = `
      mutation {
        updateHoroscope(id: "${horoscope?.id}", input: { status: "sent" }) {
          success
          message
          horoscope {
            _id
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
    await _createHoroscope();
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
