# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode with auto-reload
pnpm dev

# Run tests
pnpm test

# Run a specific test file
NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules --no-warnings' jest src/__tests__/file-name.test.ts

# Run tests with coverage
pnpm test:coverage

# Lint the code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Check types without emitting files
pnpm check-types

# Format code with prettier
pnpm format

# Check code formatting
pnpm format:check

# Run all checks (format, lint, types, tests)
pnpm validate

# Inspect MCP tool schema
pnpm inspect
```

## Architecture Overview

This project is a Model Context Protocol (MCP) server for SonarQube, which allows AI assistants to interact with SonarQube instances through the MCP protocol.

### Key Components

1. **API Module (`api.ts`)** - Handles raw HTTP requests to the SonarQube API.

2. **SonarQube Client (`sonarqube.ts`)** - Main client implementation that:
   - Provides methods for interacting with SonarQube API endpoints
   - Handles parameter transformation and request formatting
   - Uses the API module for actual HTTP requests

3. **MCP Server (`index.ts`)** - Main entry point that:
   - Initializes the MCP server
   - Registers tools for SonarQube operations (projects, issues, metrics, etc.)
   - Maps incoming MCP tool requests to SonarQube client methods

### Data Flow

1. MCP clients make requests to the server through registered tools
2. Tool handlers transform parameters to SonarQube-compatible format
3. SonarQube client methods are called with transformed parameters
4. API module executes HTTP requests to SonarQube
5. Responses are formatted and returned to the client

### Testing Considerations

- Tests use `nock` to mock HTTP responses for SonarQube API endpoints
- The `axios` library is used for HTTP requests but is mocked in tests
- Environment variables control SonarQube connection settings:
  - `SONARQUBE_TOKEN` (required)
  - `SONARQUBE_URL` (defaults to https://sonarcloud.io)
  - `SONARQUBE_ORGANIZATION` (optional)