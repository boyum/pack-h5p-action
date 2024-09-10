// @ts-check
/** @type {import('jest').Config} */
export default {
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testRunner: "jest-circus/runner",
  transform: {
    "^.+\\.ts$": [
      "ts-jest", { 
        isolatedModules: true,
        useESM: true
      }
    ]
  },
  verbose: true,
};
