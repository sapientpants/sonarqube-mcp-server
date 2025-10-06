# Build stage - compile TypeScript to JavaScript
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.17.0

# Install ALL dependencies (including dev) needed for build
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code and build configuration
COPY src/ ./src/
COPY tsconfig.json tsconfig.build.json ./

# Build the application
RUN pnpm run build

# Production dependencies stage - prepare clean node_modules
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.17.0

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Production stage - minimal stdio-only runtime
FROM node:22-alpine

# Update OpenSSL to fix CVE-2025-9230, CVE-2025-9231, CVE-2025-9232
# Upgrade libcrypto3 and libssl3 from 3.5.1-r0 to 3.5.4-r0
RUN apk update && \
    apk upgrade --no-cache libcrypto3 libssl3 && \
    rm -rf /var/cache/apk/*

# Create non-root user upfront
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy production dependencies from deps stage (clean, no dev deps)
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json for metadata
COPY --from=deps /app/package.json ./package.json

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set default environment for production
ENV NODE_ENV=production
ENV LOG_LEVEL=INFO
# Default to stdio transport, can be overridden at runtime
ENV MCP_TRANSPORT=stdio

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port for HTTP transport (ignored when using stdio)
EXPOSE 3000

# Health check for HTTP mode (no-op for stdio mode)
# Uses node's built-in http module for more secure health checking
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD if [ "$MCP_TRANSPORT" = "http" ]; then \
        node -e "require('http').get('http://127.0.0.1:3000/health', (res) => { \
          if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
        }).on('error', () => { process.exit(1); });" || exit 1; \
      else \
        exit 0; \
      fi

# Start the server with optimized flags
CMD ["node", "--experimental-specifier-resolution=node", "--max-old-space-size=512", "dist/index.js"] 