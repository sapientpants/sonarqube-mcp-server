FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.7.0

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

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "--experimental-specifier-resolution=node", "dist/index.js"] 