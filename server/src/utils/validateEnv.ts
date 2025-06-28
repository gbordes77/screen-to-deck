import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  OPENAI_API_KEY: Joi.string().required()
    .description('OpenAI API key is required for OCR functionality'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/jpg,image/png,image/webp'),
  SCRYFALL_API_URL: Joi.string().default('https://api.scryfall.com'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
}).unknown(true);

export const validateEnv = (): void => {
  const { error, value } = envSchema.validate(process.env);

  if (error) {
    console.error('❌ Environment validation failed:');
    console.error(error.details.map(detail => `  - ${detail.message}`).join('\n'));
    
    // Show helpful messages for missing required variables
    if (error.details.some(detail => detail.context?.key === 'OPENAI_API_KEY')) {
      console.error('\n💡 To fix this:');
      console.error('  1. Copy server/env.example to server/.env');
      console.error('  2. Add your OpenAI API key to the .env file');
      console.error('  3. Get your API key from: https://platform.openai.com/api-keys');
    }
    
    process.exit(1);
  }

  // Update process.env with validated and default values
  Object.assign(process.env, value);
  
  console.log('✅ Environment validation passed');
  console.log(`🔧 Running in ${process.env.NODE_ENV} mode`);
}; 