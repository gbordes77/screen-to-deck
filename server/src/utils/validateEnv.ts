import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  OFFLINE_MODE: Joi.boolean().default(false),
  OPENAI_API_KEY: Joi.alternatives().try(
    Joi.string(),
    Joi.valid('').strip()
  ).when('OFFLINE_MODE', { is: false, then: Joi.string().required().messages({ 'any.required': 'OPENAI_API_KEY is required when OFFLINE_MODE is false' }) }),
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
  if (process.env.OFFLINE_MODE === 'true') {
    console.log('📦 OFFLINE_MODE enabled: using local OCR and Scryfall dataset');
  }
}; 