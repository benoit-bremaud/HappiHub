module.exports = { ...require('./jest.config.cjs'), testPathIgnorePatterns: ['/node_modules/'], setupFilesAfterEnv: [],
  testMatch: ['**/tests/integration/**/*.test.js'], coverageDirectory: 'coverage/integration',
  globalSetup: './tests/integration/globalSetup.cjs', globalTeardown: './tests/integration/globalTeardown.cjs' };
