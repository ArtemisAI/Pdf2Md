# Multi-stage build for MCP HTTP Server with GPU support
FROM node:20-bullseye AS node-base
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Enable pnpm
RUN corepack enable && pnpm install

# Build stage
FROM node-base AS builder
COPY src ./src
RUN pnpm run build

# Production dependencies
FROM node-base AS prod-deps
RUN pnpm install --production

# Final runtime stage
FROM nvidia/cuda:12.3.2-cudnn9-runtime-ubuntu22.04 AS runtime
WORKDIR /app

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy Node.js dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy setup script for Python dependencies
COPY setup.sh ./

# Install Python dependencies (with error handling)
RUN chmod +x setup.sh && ./setup.sh || echo "Python setup completed with warnings"

# Set up environment variables
ENV NODE_ENV=production
ENV MCP_HTTP_MODE=true
ENV MCP_HTTP_PORT=3000
ENV DISABLE_REDIS=true
ENV PYTHONUNBUFFERED=1
ENV PYTHONUTF8=1

# GPU environment variables
ENV CUDA_VISIBLE_DEVICES=0
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV OMP_NUM_THREADS=4

# Create uploads and logs directories
RUN mkdir -p uploads logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start the HTTP server
ENTRYPOINT ["node", "dist/index.js"]