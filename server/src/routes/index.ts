import { Router } from 'express';
import ocrRoutes from './ocr';
import exportRoutes from './export';
import cardsRoutes from './cards';

const router = Router();

// API routes
router.use('/ocr', ocrRoutes);
router.use('/export', exportRoutes);
router.use('/cards', cardsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'MTG Deck Converter API',
    version: '1.0.0',
    description: 'Convert MTG deck screenshots to importable deck lists',
    endpoints: {
      ocr: {
        'POST /api/ocr/upload': 'Upload and process deck screenshot',
        'GET /api/ocr/status/:id': 'Get processing status',
      },
      export: {
        'POST /api/export/:format': 'Export deck list to specific format',
        'POST /api/export/all': 'Export deck list to all formats',
        'POST /api/export/stats': 'Generate deck statistics',
      },
      cards: {
        'GET /api/cards/search': 'Search for MTG cards',
        'GET /api/cards/:id': 'Get card by Scryfall ID',
        'POST /api/cards/validate': 'Validate a list of cards',
        'GET /api/cards/random': 'Get a random card',
      },
      health: {
        'GET /api/health': 'API health check endpoint',
      },
    },
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint under /api for compatibility with Docker/infra checks
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    scope: 'api',
    timestamp: new Date().toISOString(),
  });
});

export default router; 