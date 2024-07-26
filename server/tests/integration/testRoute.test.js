import { jest } from '@jest/globals';
import mongoose from 'mongoose';
// tests/integration/testRoute.test.js
import request from 'supertest';

let app;

beforeAll(async () => {
  jest.mock('@config/mongo.js', () => ({
    connectDB: jest.fn().mockImplementation(() => {
      console.log('Mocked MongoDB connection.');
    }),
  }));

  const module = await import('../../server');
  app = module.default;
});

afterAll(async () => {
  console.log("Closing mongoose connection...");
  await mongoose.connection.close();
  jest.clearAllMocks();
  jest.clearAllTimers();
  console.log("All mocks and timers cleared.");
});

describe('GET /test', () => {
  it('should return a greeting message', async () => {
    const res = await request(app).get('/test');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello HappiHub Server!');
    console.log("Test passed!");
  });
});
