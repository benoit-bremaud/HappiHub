module.exports = { ...require('./jest.config.cjs'), testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/integration/**/*.test.js'], coverageDirectory: 'coverage/integration',
  globalSetup: './tests/integration/globalSetup.js', globalTeardown: './tests/integration/globalTeardown.js' };
