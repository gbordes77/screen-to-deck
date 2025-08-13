/**
 * Jest Configuration for OCR Validation Suite
 */

module.exports = {
  // Use TypeScript preset
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  roots: ['<rootDir>/tests', '<rootDir>/server/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true
      }
    }]
  },
  
  // Module name mapper for imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/src/$1',
    '^@types/(.*)$': '<rootDir>/server/src/types/$1',
    '^@services/(.*)$': '<rootDir>/server/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/server/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/server/src/config/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'server/src/**/*.{ts,tsx}',
    '!server/src/**/*.d.ts',
    '!server/src/**/*.test.ts',
    '!server/src/**/*.spec.ts',
    '!server/src/types/**',
    '!server/src/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './server/src/services/optimizedOcrService.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './server/src/services/mtgoLandCorrector.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test timeout
  testTimeout: 60000,
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'test-report.html',
      openReport: false,
      pageTitle: 'MTG OCR Validation Test Report',
      logoImgPath: './docs/logo.png',
      hideIcon: false,
      expand: false
    }],
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.git/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(module-to-transform)/)'
  ]
};