# =============================================================================
# JENEUS HelpDesk — Multi-stage Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Vite + React + TypeScript)
# -----------------------------------------------------------------------------
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend (Express + TypeScript + Prisma)
# -----------------------------------------------------------------------------
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate && npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Image
# -----------------------------------------------------------------------------
FROM node:18-alpine-slim

RUN apk add --no-cache tini

WORKDIR /app

# Copy built backend (compiled JS + node_modules)
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./

# Copy Prisma schema so migrations / generate can run at runtime if needed
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma

# Copy built frontend (served as static files by the backend or a reverse proxy)
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
