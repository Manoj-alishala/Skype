# ─────────────────────────────────────────────
# Stage 1: Build the React (Vite) client
# ─────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production image (Express server)
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN npm ci --prefix server

# Copy server source
COPY server/ ./server/

# Copy built client from stage 1 → where server.js expects it
COPY --from=client-builder /app/client/dist ./client/dist

# Copy root package.json (scripts reference)
COPY package.json ./

# Don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

CMD ["node", "server/server.js"]
