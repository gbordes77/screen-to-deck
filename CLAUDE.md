# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MTG Screen-to-Deck - An AI-powered Magic: The Gathering deck scanner that converts card screenshots into validated deck lists. The project consists of three main components:
- **Web Application**: React/TypeScript frontend with Express backend
- **Discord Bot**: Python bot with EasyOCR and Scryfall integration  
- **API Server**: Node.js/Express server handling OCR, validation, and export

## Common Development Commands

### Full Stack Development
```bash
# Install all dependencies (frontend + backend)
npm install

# Run both frontend and backend in development mode
npm run dev

# Run for self-hosting (exposes on LAN)
npm run dev:selfhost

# Build production version
npm run build

# Run tests
npm run test

# Lint code
npm run lint
npm run lint:fix

# Type check TypeScript
cd client && npm run type-check
```

### Backend Server Commands
```bash
cd server
npm run dev        # Development mode with hot reload
npm run build      # Build TypeScript to JavaScript
npm run start      # Start production server
npm run test       # Run Jest tests
npm run lint       # ESLint check
```

### Frontend Client Commands
```bash
cd client
npm run dev        # Start Vite dev server (port 5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # ESLint check
```

### Discord Bot Commands
```bash
cd discord-bot
pip install -r requirements.txt  # Install Python dependencies
python bot.py                     # Run bot
./start_bot.sh                   # Automated startup script

# Testing
python tests/test_parser.py      # Test OCR parser
python tests/test_scryfall.py    # Test Scryfall integration
python tests/test_export.py      # Test export formats
```

### Docker Commands
```bash
docker-compose up -d              # Start all services
docker-compose -f docker-compose.prod.yml up -d  # Production deployment
docker-compose logs -f            # View logs
docker-compose down              # Stop services
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Router
- **Backend**: Node.js, Express, TypeScript, OpenAI Vision API
- **Discord Bot**: Python 3.8+, discord.py, EasyOCR, Scryfall API
- **External Services**: OpenAI Vision (OCR), Scryfall API (card validation), optional Redis cache, Cloudflare R2, Supabase

### Key API Endpoints
- `POST /api/ocr` - Upload image for OCR processing
- `GET /api/ocr/status/:jobId` - Check processing status
- `GET /api/cards/search` - Search Scryfall for cards
- `POST /api/cards/validate` - Validate card names
- `POST /api/export` - Export deck to various formats (MTGA, Moxfield, etc.)

### Data Flow
1. User uploads image via web UI or Discord
2. Image processed by OpenAI Vision API (web) or EasyOCR (Discord bot)
3. Card names validated/corrected via Scryfall API with fuzzy matching
4. Results cached and returned with export options
5. Multiple export formats available (MTGA, Moxfield, Archidekt, TappedOut)

### Key Services
- **ocrService.ts**: Handles OpenAI Vision integration and image preprocessing
- **scryfallService.ts**: Manages Scryfall API interactions with caching and rate limiting
- **enhanced-ocr.service.ts**: Parallel OCR pipelines with validation
- **ocr_parser_easyocr.py**: Discord bot's OCR processing with intelligent grouping
- **scryfall_service.py**: Python Scryfall client with auto-correction

### Environment Configuration
Required environment variables:
- `OPENAI_API_KEY` - Required for web OCR
- `DISCORD_TOKEN` - Required for Discord bot
- `API_BASE_URL` - Backend API URL (default: http://localhost:3001/api)
- `SCRYFALL_API_URL` - Scryfall API (default: https://api.scryfall.com)
- Optional: Redis, Cloudflare R2, Supabase credentials

### Testing Approach
- **Backend**: Jest for unit/integration tests
- **Frontend**: Vite's built-in test runner (if configured)
- **Discord Bot**: pytest with async support
- Run `npm run test` for full test suite
- Python tests in `discord-bot/tests/` directory

### Development Workflow
1. Frontend runs on port 5173, proxies `/api` calls to backend on port 3001
2. Backend validates env vars on startup via `validateEnv.ts`
3. Discord bot can run independently or connect to backend API
4. All components support hot reload in development mode
5. Use concurrent development with `npm run dev` for full stack