module.exports = { ...require('./jest.config.cjs'), testPathIgnorePatterns: ['/node_modules/'], setupFilesAfterEnv: [],
  testMatch: ['**/tests/integration/**/*.test.js'], coverageDirectory: 'coverage/integration',
  coverageThreshold: { global: { branches: 80 } },
  globalSetup: './tests/integration/globalSetup.cjs', globalTeardown: './tests/integration/globalTeardown.cjs' };
