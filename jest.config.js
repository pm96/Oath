module.exports = {
    testEnvironment: "node",
    transform: {
        "^.+\\.tsx?$": ["babel-jest", { configFile: "./babel.config.js" }],
    },
    testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    // Performance optimizations
    maxWorkers: "50%", // Use half of available CPU cores
    testTimeout: 30000, // 30 second timeout per test
    collectCoverage: false, // Disable coverage collection for faster runs
    // Cache configuration for faster subsequent runs
    cacheDirectory: "<rootDir>/.jest-cache",
    clearMocks: true,
    // Optimize test execution
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    watchman: false,
};
