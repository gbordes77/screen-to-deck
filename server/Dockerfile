# Server Dockerfile (Node.js API)
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --production=false || npm install --legacy-peer-deps --production=false

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

EXPOSE 3001
CMD ["node", "dist/index.js"]
