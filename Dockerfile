# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.7.1

# Create .npmrc to ensure pnpm uses the overrides
RUN echo "enable-pre-post-scripts=false" > .npmrc

# Disable Husky during Docker build
ENV SKIP_HUSKY=1
ENV NODE_ENV=production

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript code
RUN pnpm run build

# Production stage
FROM node:20-alpine

# No additional packages needed for stdio transport

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.7.1

# Create .npmrc to ensure pnpm uses the overrides
RUN echo "enable-pre-post-scripts=false" > .npmrc

# Disable Husky during Docker build
ENV SKIP_HUSKY=1
ENV NODE_ENV=production

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# stdio transport - no ports or HTTP configuration needed

# Start the server
CMD ["node", "--experimental-specifier-resolution=node", "dist/index.js"] 