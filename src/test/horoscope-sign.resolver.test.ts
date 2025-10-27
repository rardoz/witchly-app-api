import { HoroscopeSign } from '../models/HoroscopeSign';

describe('HoroscopeSignResolver', () => {
  let createdSignId: string;
  const testLocale = 'en_US';
  const testSign = 'aries';

  afterAll(async () => {
    await HoroscopeSign.deleteMany({});
  });

  it('should create a horoscope sign', async () => {
    const mutation = `
      mutation CreateHoroscopeSign($input: CreateHoroscopeSignInput!) {
        createHoroscopeSign(input: $input) {
          success
          message
          sign {
            id
            sign
            locale
            description
            signDateStart
            signDateEnd
            imageAsset
            title
          }
        }
      }
    `;
    const variables = {
      input: {
        sign: testSign,
        locale: testLocale,
        description: 'The first sign of the zodiac',
        signDateStart: '2025-03-21T00:00:00.000Z',
        signDateEnd: '2025-04-19T00:00:00.000Z',
        imageAsset: 'https://example.com/aries.png',
        title: 'Aries the Ram',
      },
    };
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation, variables });
    expect(res.body.data.createHoroscopeSign.success).toBe(true);
    expect(res.body.data.createHoroscopeSign.sign.sign).toBe(testSign);
    expect(res.body.data.createHoroscopeSign.sign.locale).toBe(testLocale);
    createdSignId = res.body.data.createHoroscopeSign.sign.id;
  });

  it('should get horoscope signs by locale', async () => {
    const query = `
      query GetHoroscopeSigns($locale: String!) {
        getHoroscopeSigns(locale: $locale) {
          id
          sign
          locale
          description
          title
        }
      }
    `;
    const variables = { locale: testLocale };
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query, variables });
    expect(res.body.data.getHoroscopeSigns.length).toBeGreaterThan(0);
    expect(res.body.data.getHoroscopeSigns[0].sign).toBe(testSign);
  });

  it('should update a horoscope sign', async () => {
    const mutation = `
      mutation UpdateHoroscopeSign($id: ID!, $input: UpdateHoroscopeSignInput!) {
        updateHoroscopeSign(id: $id, input: $input) {
          success
          message
          sign {
            id
            sign
            locale
            description
            title
          }
        }
      }
    `;
    const variables = {
      id: createdSignId,
      input: {
        description: 'Updated description',
        title: 'Updated Aries Title',
      },
    };
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation, variables });
    expect(res.body.data.updateHoroscopeSign.success).toBe(true);
    expect(res.body.data.updateHoroscopeSign.sign.description).toBe(
      'Updated description'
    );
    expect(res.body.data.updateHoroscopeSign.sign.title).toBe(
      'Updated Aries Title'
    );
  });

  it('should delete a horoscope sign', async () => {
    const mutation = `
      mutation DeleteHoroscopeSign($id: ID!) {
        deleteHoroscopeSign(id: $id) {
          success
          message
        }
      }
    `;
    const variables = { id: createdSignId };
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation, variables });
    expect(res.body.data.deleteHoroscopeSign.success).toBe(true);
    // Confirm deletion
    const found = await HoroscopeSign.findById(createdSignId);
    expect(found).toBeNull();
  });
});
