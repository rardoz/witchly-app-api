// Global test types
import type request from 'supertest';

declare global {
  var testRequest: ReturnType<typeof request>;
}
