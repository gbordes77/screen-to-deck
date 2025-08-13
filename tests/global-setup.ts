/**
 * Global Test Setup
 * =================
 * Runs once before all test suites
 */

import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');
  
  // Create necessary directories
  const dirs = [
    'test-results',
    'test-images/mtga',
    'test-images/mtgo',
    'coverage',
    'uploads',
    'temp'
  ];
  
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_RUN_ID = Date.now().toString();
  
  // Check for required environment variables
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === 'TO_BE_SET');
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    console.warn('   Some tests may be skipped or fail\n');
  }
  
  // Create test environment file if it doesn't exist
  const envTestPath = path.join(process.cwd(), '.env.test');
  if (!fs.existsSync(envTestPath)) {
    const envContent = `
# Test Environment Variables
NODE_ENV=test
LOG_LEVEL=error
OPENAI_API_KEY=test-key-placeholder
API_BASE_URL=http://localhost:3001/api
DISCORD_TOKEN=test-token-placeholder
`.trim();
    
    fs.writeFileSync(envTestPath, envContent);
    console.log('📝 Created .env.test file');
  }
  
  console.log('✅ Global setup complete\n');
  console.log('=' .repeat(80) + '\n');
}