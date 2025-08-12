# 🔐 Variables d'Environnement - MTG Screen-to-Deck v2.1.0

## 📋 Vue d'Ensemble

Ce document centralise TOUTES les variables d'environnement du projet pour éviter les duplications.

---

## 🔴 Variables OBLIGATOIRES

### Backend API (server/.env)

```bash
# OpenAI Vision API - REQUIS pour OCR web
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Environment
NODE_ENV=development  # ou 'production'
```

### Discord Bot (discord-bot/.env)

```bash
# Token Discord Bot - REQUIS pour le bot
DISCORD_BOT_TOKEN=MTExxx.xxxxx.xxxxx

# Backend API URL
API_BASE_URL=http://localhost:3001/api
```

---

## 🟡 Variables RECOMMANDÉES

### Performance & Cache

```bash
# Redis Cache - Améliore performance de 3x
REDIS_URL=redis://localhost:6379
CACHE_TTL=1800  # 30 minutes
CACHE_MAX_SIZE=1000  # Nombre max d'entrées

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

### Monitoring

```bash
# Logs
LOG_LEVEL=info  # debug, info, warn, error
LOG_FILE=/var/log/screen-to-deck/app.log

# APM (optionnel)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEW_RELIC_LICENSE_KEY=xxxxx
```

---

## 🟢 Variables OPTIONNELLES

### Services Externes

```bash
# Supabase (si utilisé pour auth/db)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_KEY=eyJxxxxx

# Cloudflare R2 (stockage images)
CLOUDFLARE_R2_ACCESS_KEY_ID=xxxxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxxxx
CLOUDFLARE_R2_BUCKET=screen-to-deck
CLOUDFLARE_R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com

# Analytics (optionnel)
GOOGLE_ANALYTICS_ID=G-XXXXX
MIXPANEL_TOKEN=xxxxx
```

### Configuration Avancée

```bash
# API Server
PORT=3001
HOST=0.0.0.0
API_PREFIX=/api
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Timeouts
REQUEST_TIMEOUT_MS=30000  # 30 secondes
OCR_TIMEOUT_MS=20000      # 20 secondes

# Limites
MAX_IMAGE_SIZE_MB=10
MAX_CONCURRENT_OCR=5
```

### Frontend (client/.env)

```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# Feature Flags
VITE_ENABLE_CLIPBOARD=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false

# UI Configuration
VITE_APP_NAME="MTG Screen-to-Deck"
VITE_APP_VERSION="2.1.0"
```

---

## 🚀 Configuration par Environnement

### Development

```bash
# Copier le template
cp .env.example .env

# Configuration minimale dev
cat > .env << EOF
NODE_ENV=development
OPENAI_API_KEY=sk-proj-your-dev-key
DISCORD_BOT_TOKEN=your-dev-bot-token
API_BASE_URL=http://localhost:3001/api
LOG_LEVEL=debug
