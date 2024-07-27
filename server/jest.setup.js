import { jest } from '@jest/globals';

jest.mock('@config/mongo.js', () => ({
  connectDB: jest.fn().mockImplementation(() => {
    console.log('Mocked MongoDB connection.');
  }),
}));
