# Server Dockerfile (Node.js API)
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN addgroup -S app && adduser -S app -G app \
    && npm install --production=false || npm install --legacy-peer-deps --production=false

# Build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime image
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy only needed files
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --omit=dev || npm install --production --legacy-peer-deps
COPY --from=base /app/dist ./dist
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/uploads /app/logs \
    && chown -R app:app /app
USER app

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
