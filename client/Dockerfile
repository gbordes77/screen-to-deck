# Client Dockerfile (Vite React dev server)
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
RUN npm install || npm install --legacy-peer-deps

COPY . .

ENV HOST=0.0.0.0
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
