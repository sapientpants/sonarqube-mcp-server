# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm and configure for production build
RUN npm install -g pnpm@10.17.0 && \
    echo "enable-pre-post-scripts=false" > .npmrc

# Set environment for production build
ENV SKIP_HUSKY=1
ENV NODE_ENV=production

# Install dependencies (including dev for build)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code and build
COPY src/ ./src/
COPY tsconfig.json tsconfig.build.json ./
RUN pnpm run build

# Install production dependencies separately for clean copy
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Production stage - minimal stdio-only runtime
FROM node:22-alpine

# Create non-root user upfront
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy production dependencies from build stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment for stdio-only operation
ENV NODE_ENV=production
ENV LOG_LEVEL=INFO

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Stdio transport - no ports exposed, no health checks needed

# Start the server with optimized flags for stdio
CMD ["node", "--experimental-specifier-resolution=node", "--max-old-space-size=512", "dist/index.js"] 