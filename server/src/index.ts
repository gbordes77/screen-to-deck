import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { validateEnv } from './utils/validateEnv';
import routes from './routes';
import { initOcrWorker } from './queue/ocr.queue';
import clientProm from 'prom-client';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// Load environment variables
dotenv.config();

// Validate required environment variables
validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "https://c2.scryfall.com"],
      "connect-src": [
        "'self'",
        process.env.SCRYFALL_API_URL || 'https://api.scryfall.com',
        process.env.OPENAI_BASE || 'https://api.openai.com'
      ],
      "script-src": ["'self'"],
      "object-src": ["'none'"],
      "style-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// General middleware
app.use(compression());
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use((req, _res, next) => { (req as any).id = req.headers['x-request-id']?.toString() || uuidv4(); next(); });
app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: (req as any).id }) }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api', routes);
// Swagger (OpenAPI)
try {
  const openapi = YAML.load(require('path').join(__dirname, 'openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
} catch (e) {
  console.warn('OpenAPI load failed:', (e as Error).message);
}

// Initialize OCR worker (BullMQ)
initOcrWorker(async (data: any) => {
  // Reuse existing process function from ocr route
  const { default: scryfallService } = await import('./services/scryfallService');
  const { default: ocrSvc } = await import('./services/ocrService');
  const { processImageAsync } = await import('./routes/ocr');
  // process in same process to keep it simple; BullMQ provides persistence and retries
  await (processImageAsync as any)(data.processId, data.filePath, { validateCards: data.validateCards, deckName: data.deckName });
});

// Prometheus metrics endpoint
clientProm.collectDefaultMetrics();
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', clientProm.register.contentType);
  res.end(await clientProm.register.metrics());
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 MTG Deck Converter Server running on port ${PORT}`);
  console.log(`📸 Ready to convert deck screenshots!`);
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
});

export default app; 