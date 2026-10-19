module.exports = { clearMocks: true, testEnvironment: 'node', collectCoverage: true, coverageDirectory: 'coverage', testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/fastBcrypt.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  collectCoverageFrom: ['**/*.js', '!coverage/**', '!node_modules/**', '!tests/**', '!*.config.*', '!server.js', '!jobs/runMaintenance.js', '!jobs/migrate.js', '!scripts/build-communes.js'] };
