module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

