module.exports = { clearMocks: true, testEnvironment: 'node', collectCoverage: true, coverageDirectory: 'coverage', testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  collectCoverageFrom: ['**/*.js', '!coverage/**', '!node_modules/**', '!tests/**', '!*.config.*', '!server.js', '!jobs/runMaintenance.js', '!jobs/migrate.js'] };
