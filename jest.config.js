module.exports = {
  bail: 1,
  testEnvironment: "node",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 15000,
  rootDir: ".",
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.js"],
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    "^~src/(.*)$": "<rootDir>/src/$1",
    "^~test/(.*)$": "<rootDir>/test/$1",
    "^~type/(.*)$": "<rootDir>/type/$1"
  },
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  collectCoverageFrom: ["**/*.ts"],
  coverageDirectory: "./coverage"
};
