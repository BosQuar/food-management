# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the SvelteKit app
RUN npm run build

# Build the server TypeScript
RUN npm run build:server

# Production stage
FROM node:20-alpine

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    apk del python3 make g++

# Copy server files (compiled JS + SQL schema already included from build:server)
COPY --from=builder /app/server/dist ./server/dist

# Copy built assets from builder to where server expects it (../build relative to server/dist/server/)
COPY --from=builder /app/build ./server/dist/build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8500

# Expose port
EXPOSE 8500

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8500/api/health || exit 1

# Start the server
CMD ["node", "server/dist/server/index.js"]
