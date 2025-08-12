# 🚀 Guide de Déploiement - MTG Screen-to-Deck

**Version**: 2.1.0  
**Options**: Docker, Self-hosting, Cloud  
**Temps estimé**: 15-30 minutes

---

## 📋 Options de Déploiement

### 1. Docker Compose (Recommandé) 🐳

#### Installation Rapide
```bash
# 1. Configuration
cp .env.example .env
# Éditer .env avec vos clés API

# 2. Build
docker-compose build

# 3. Lancer
docker-compose up -d

# ✅ Accès: http://localhost:3001
```

#### Configuration Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  web-api:
    image: mtg-screen-to-deck-api:latest
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "3001:3001"
    restart: always
    
  web-frontend:
    image: mtg-screen-to-deck-frontend:latest
    ports:
      - "80:80"
    restart: always
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always
```

### 2. Self-Hosting (VPS/Serveur Local) 🖥️

#### Prérequis
- Ubuntu 20.04+ / Debian 11+
- 2GB RAM minimum
- Node.js 20+
- nginx (reverse proxy)

#### Installation
```bash
# 1. Cloner le projet
git clone https://github.com/yourusername/screen-to-deck
cd screen-to-deck

# 2. Installer dépendances
npm install
npm run build

# 3. Configuration nginx
sudo cp nginx.conf /etc/nginx/sites-available/screen-to-deck
sudo ln -s /etc/nginx/sites-available/screen-to-deck /etc/nginx/sites-enabled/
sudo nginx -s reload

# 4. Service systemd
sudo cp screen-to-deck.service /etc/systemd/system/
sudo systemctl enable screen-to-deck
sudo systemctl start screen-to-deck
```

### 3. Cloud Platforms ☁️

#### Fly.io (Simple & Rapide)
```bash
# 1. Installer Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Déployer
fly launch
fly secrets set OPENAI_API_KEY=sk-...
fly deploy

# ✅ URL: https://your-app.fly.dev
```

#### Railway (Managed)
```bash
# 1. Installer Railway CLI
npm i -g @railway/cli

# 2. Déployer
railway login
railway up
railway vars set OPENAI_API_KEY=sk-...

# ✅ URL: https://your-app.railway.app
```

#### Vercel (Frontend Only)
```bash
# Frontend uniquement
cd client
npm i -g vercel
vercel

# Backend sur autre plateforme
```

---

## 🔧 Configuration Environnement

### Variables Essentielles
```bash
# Production .env
NODE_ENV=production
PORT=3001

# API Keys (OBLIGATOIRE)
OPENAI_API_KEY=sk-proj-...

# URLs
API_BASE_URL=https://yourdomain.com/api
CLIENT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Cache (Recommandé)
REDIS_URL=redis://localhost:6379
CACHE_TTL=86400

# Sécurité
RATE_LIMIT_MAX=100
JWT_SECRET=your-secret-key

# Monitoring (Optionnel)
SENTRY_DSN=https://...
```

### Configuration SSL/TLS

#### Let's Encrypt avec Certbot
```bash
# Installation
sudo apt install certbot python3-certbot-nginx

# Obtenir certificat
sudo certbot --nginx -d yourdomain.com

# Auto-renouvellement
sudo certbot renew --dry-run
```

---

## 🐳 Docker Production

### Build Optimisé
```dockerfile
# Dockerfile.prod
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Docker Compose avec Tous Services
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ssl_certs:/etc/letsencrypt
    depends_on:
      - api
      - frontend

  api:
    build: 
      context: ./server
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: always

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.prod
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

  discord-bot:
    build: ./discord-bot
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - API_URL=http://api:3001
    restart: always

volumes:
  redis_data:
  ssl_certs:
```

---

## 🌐 Configuration Reverse Proxy

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

---

## 📊 Monitoring Production

### Health Checks
```bash
# API Health
curl https://yourdomain.com/api/health

# Redis
redis-cli ping

# Discord Bot
curl http://localhost:8080/health
```

### Logs
```bash
# Docker logs
docker-compose logs -f api

# PM2 logs
pm2 logs

# System logs
journalctl -u screen-to-deck -f
```

### Métriques avec Prometheus
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mtg-api'
    static_configs:
      - targets: ['localhost:3001']
```

---

## 🔐 Sécurité Production

### Checklist Sécurité
- [ ] HTTPS/SSL activé
- [ ] Variables d'environnement sécurisées
- [ ] Rate limiting configuré
- [ ] CORS restrictif
- [ ] Firewall configuré
- [ ] Logs centralisés
- [ ] Backups automatiques
- [ ] Monitoring actif

### Firewall (UFW)
```bash
# Configuration basique
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

---

## 🔄 Mise à Jour

### Process de Mise à Jour
```bash
# 1. Backup
docker-compose exec postgres pg_dump > backup.sql

# 2. Pull dernière version
git pull origin main

# 3. Rebuild
docker-compose build

# 4. Deploy avec zero-downtime
docker-compose up -d --no-deps --build api

# 5. Vérification
curl https://yourdomain.com/api/health
```

---

## 🆘 Troubleshooting

### Problèmes Courants

#### Port déjà utilisé
```bash
# Identifier le process
sudo lsof -i :3001
# Tuer le process
sudo kill -9 [PID]
```

#### Docker permissions
```bash
sudo usermod -aG docker $USER
newgrp docker
```

#### Redis connection refused
```bash
# Vérifier Redis
redis-cli ping
# Redémarrer
sudo systemctl restart redis
```

#### Mémoire insuffisante
```bash
# Ajouter swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📚 Ressources

- [Docker Documentation](https://docs.docker.com)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org)
- [PM2 Process Manager](https://pm2.keymetrics.io)

---

*Guide de déploiement pour tous les environnements*