# Base stage will contain python dependencies
FROM node:current-alpine3.22 AS base
WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 curl bash

# Copy the source code
COPY . .
# Remove the python version, otherwise it won't find python
RUN rm .python-version

# Enable pnpm
RUN corepack enable

# Install Python dependencies
RUN ./setup.sh

# Use a separate stage for building to save space
FROM base AS builder

# Install Node.js dependencies
RUN pnpm install

# Build the project
RUN pnpm run build

# Final stage for the image (doing the build separately saves about 100MB)
FROM base AS runner

# Install production Node.js dependencies
RUN pnpm install --production

# Copy the built application
COPY --from=builder /app/dist ./dist

# Expose the HTTP port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables for HTTP mode
ENV MCP_TRANSPORT=http
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PYTHONUTF8=1
ENV NODE_ENV=production

# Create directories for file processing
RUN mkdir -p /app/uploads /app/output /app/temp

# Change the default command to HTTP mode
CMD ["node", "dist/index.js", "--http"]