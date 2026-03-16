# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
COPY backend/ /build/backend/
RUN npm run build
# Output is in /build/backend/public/

# ---- Stage 2: Production Backend ----
FROM node:22-alpine AS production

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src/ ./src/
COPY --from=frontend /build/backend/public/ ./public/

EXPOSE 3000

CMD ["node", "src/server.js"]
