/**
 * Jest Test Setup
 * ===============
 * Configuration and setup for all tests
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '..', '.env.test')
});

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Mock console methods to reduce noise during tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Only show console output if VERBOSE=true
if (process.env.VERBOSE !== 'true') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep errors visible
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('❌')) {
      originalConsole.error(...args);
    }
  };
}

// Global test utilities
global.testUtils = {
  // Wait for condition with timeout
  waitFor: async (condition: () => boolean, timeout = 5000, interval = 100): Promise<void> => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  },
  
  // Retry function with exponential backoff
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> => {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  },
  
  // Mock file system for tests
  mockFileSystem: (files: Record<string, string>) => {
    const fs = require('fs');
    const originalReadFileSync = fs.readFileSync;
    const originalExistsSync = fs.existsSync;
    
    fs.readFileSync = jest.fn((path: string) => {
      if (files[path]) {
        return Buffer.from(files[path]);
      }
      return originalReadFileSync(path);
    });
    
    fs.existsSync = jest.fn((path: string) => {
      return !!files[path] || originalExistsSync(path);
    });
    
    return () => {
      fs.readFileSync = originalReadFileSync;
      fs.existsSync = originalExistsSync;
    };
  },
  
  // Create test image buffer
  createTestImage: (width = 1920, height = 1080): Buffer => {
    // Create a simple PNG buffer for testing
    const sharp = require('sharp');
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .png()
    .toBuffer();
  }
};

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  },
  
  toHaveCardCount(received: any[], expectedMain: number, expectedSide: number) {
    const mainCount = received.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    const sideCount = received.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    
    const pass = mainCount === expectedMain && sideCount === expectedSide;
    if (pass) {
      return {
        message: () => `expected not to have ${expectedMain} mainboard and ${expectedSide} sideboard cards`,
        pass: true
      };
    } else {
      return {
        message: () => 
          `expected ${expectedMain} mainboard and ${expectedSide} sideboard cards, ` +
          `but got ${mainCount} mainboard and ${sideCount} sideboard`,
        pass: false
      };
    }
  }
});

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveCardCount(expectedMain: number, expectedSide: number): R;
    }
  }
  
  var testUtils: {
    waitFor: (condition: () => boolean, timeout?: number, interval?: number) => Promise<void>;
    retry: <T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number) => Promise<T>;
    mockFileSystem: (files: Record<string, string>) => () => void;
    createTestImage: (width?: number, height?: number) => Buffer;
  };
}

// Clean up after all tests
afterAll(() => {
  // Restore console
  if (process.env.VERBOSE !== 'true') {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
});

export {};