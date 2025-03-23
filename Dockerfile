# Builder stage
FROM rust:1-slim-bookworm as builder

WORKDIR /app

# Install required dependencies for building
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest files first to cache dependencies
COPY Cargo.toml Cargo.lock ./

# Create a dummy src/main.rs to build dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy the actual source code
COPY src/ src/

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from the builder stage
COPY --from=builder /app/target/release/sonarqube-mcp-server /usr/local/bin/

# Set environment variables (these can be overridden at runtime)
ENV SONARQUBE_URL=https://sonarqube.example.com
ENV SONARQUBE_TOKEN=your-token-here
# ENV SONARQUBE_ORGANIZATION=your-organization
# ENV SONARQUBE_DEBUG=false

# Expose port if needed (adjust based on your application)
# EXPOSE 8080

# Run the MCP server
ENTRYPOINT ["sonarqube-mcp-server", "--mcp"] 