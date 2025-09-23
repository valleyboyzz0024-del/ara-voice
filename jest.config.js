module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'index.js',
    'app.js',
    '!tests/**'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};