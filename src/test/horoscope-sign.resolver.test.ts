import { HoroscopeSign } from '../models/HoroscopeSign';

describe('HoroscopeSignResolver', () => {
  const testLocale = 'en_US';
  const testSign = 'aries';

  afterAll(async () => {
    await HoroscopeSign.deleteMany({});
  });

  async function _createHoroscope(locale: string) {
    const mutation = `
      mutation CreateHoroscopeSign($input: CreateHoroscopeSignInput!) {
        createHoroscopeSign(input: $input) {
          success
          message
          sign {
            _id
            sign
            locale
            description
            signDateStart
            signDateEnd
            asset {
              id
              s3Key
            }
            title
          }
        }
      }
    `;

    const variables = {
      input: {
        sign: testSign,
        locale: locale,
        description: 'The first sign of the zodiac',
        signDateStart: '2025-03-21T00:00:00.000Z',
        signDateEnd: '2025-04-19T00:00:00.000Z',
        asset: '64b8f0f2c2a1f2a5d6e8b123',
        title: 'Aries the Ram',
      },
    };
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query: mutation, variables });
    return res.body.data;
  }
  it('should create a horoscope sign', async () => {
    const data = await _createHoroscope(testLocale);
    expect(data.createHoroscopeSign.success).toBe(true);
    expect(data.createHoroscopeSign.sign.sign).toBe(testSign);
    expect(data.createHoroscopeSign.sign.locale).toBe(testLocale);
  });

  it('should get horoscope signs by locale', async () => {
    await _createHoroscope('en_CA');
    const query = `
      query GetHoroscopeSigns($locale: String!) {
        getHoroscopeSigns(locale: $locale) {
          records {
            _id
            sign
            locale
            description
            title
          }
          totalCount
          limit
          offset
        }
      }
    `;
    const variables = { locale: testLocale };
    const res = await global
      .adminUserAdminAppTestRequest()
      .send({ query, variables });
    expect(res.body.data.getHoroscopeSigns.records.length).toBeGreaterThan(0);
    expect(res.body.data.getHoroscopeSigns.records[0].sign).toBe(testSign);
    expect(res.body.data.getHoroscopeSigns.totalCount).toBeGreaterThan(0);
    expect(res.body.data.getHoroscopeSigns.limit).toBe(10);
    expect(res.body.data.getHoroscopeSigns.offset).toBe(0);
  });

  it('should update a horoscope sign', async () => {
    const data = await _createHoroscope('en_GB');
    const mutation = `
      mutation UpdateHoroscopeSign($id: ID!, $input: UpdateHoroscopeSignInput!) {
        updateHoroscopeSign(id: $id, input: $input) {
          success
          message
          sign {
            _id
            sign
            locale
            description
            title
          }
        }
      }
    `;
    const variables = {
      id: data.createHoroscopeSign.sign._id,
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
    const data = await _createHoroscope('en_AU');
    const createdSignId = data.createHoroscopeSign.sign._id;
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
