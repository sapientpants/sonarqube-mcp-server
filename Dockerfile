FROM node:20-alpine

# Install required packages for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.7.1

# Disable Husky during Docker build
ENV SKIP_HUSKY=1
ENV NODE_ENV=production

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript code
RUN pnpm run build

# Clean up dev dependencies and install production dependencies
RUN rm -rf node_modules && \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# Create logs directory and set permissions
RUN mkdir -p logs/audit && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set default environment variables for HTTP transport
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_HTTP_PORT=3000

# Expose the port the app runs on
EXPOSE 3000
# Expose metrics port
EXPOSE 9090

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "--experimental-specifier-resolution=node", "dist/index.js"] 