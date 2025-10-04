describe('Express App', () => {
  describe('GET /', () => {
    it('should return hello message', async () => {
      const response = await testRequest.get('/');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, Express API with GraphQL!');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await testRequest.get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('Non-existent routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await testRequest.get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});
