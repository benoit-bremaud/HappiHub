// Jest configuration file
export default {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1', // Map '@config/' to the 'config' directory
  },
  transform: {},
};
