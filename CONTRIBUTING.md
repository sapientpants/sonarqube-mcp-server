# Contributing to SonarQube MCP Server

Thank you for your interest in contributing to the SonarQube MCP Server! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (OS, Node version, etc.)
   - Error messages and logs

### Submitting Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies** with `pnpm install`
3. **Make your changes**:
   - Write clear, concise commit messages
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed
4. **Test your changes**:
   - Run `pnpm test` to ensure all tests pass
   - Run `pnpm lint` to check code style
   - Run `pnpm check-types` for TypeScript validation
   - Run `pnpm validate` to run all checks
5. **Submit the pull request**:
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure CI checks pass

## Development Setup

### Prerequisites

- Node.js 22 or higher
- pnpm 10.17.0 or higher
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/your-username/sonarqube-mcp-server.git
cd sonarqube-mcp-server

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Development Commands

```bash
# Build the project
pnpm build

# Run in development mode with watch
pnpm dev

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run a specific test file
NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules --no-warnings' jest src/__tests__/file-name.test.ts

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Check TypeScript types
pnpm check-types

# Format code
pnpm format

# Check formatting
pnpm format:check

# Run all validations
pnpm validate

# Inspect MCP schema
pnpm inspect
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid using `any` type
- Use interfaces for object shapes
- Export types that might be used by consumers

### Code Style

- Follow the existing code style
- Use ESLint and Prettier configurations
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Mock external dependencies
- Test error cases and edge conditions

### Git Commit Messages

Follow conventional commit format:

```
type(scope): subject

body

footer
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Example:

```
feat(api): add support for branch filtering

Add branch parameter to issues endpoint to allow filtering
issues by specific branch

Closes #123
```

## Project Structure

```
sonarqube-mcp-server/
├── src/
│   ├── __tests__/      # Test files
│   ├── api.ts          # API module for HTTP requests
│   ├── index.ts        # MCP server entry point
│   └── sonarqube.ts    # SonarQube client implementation
├── dist/               # Compiled output
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest test configuration
└── eslint.config.js    # ESLint configuration
```

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Mock external dependencies
- Cover edge cases and error scenarios
- Use descriptive test names

### Integration Tests

- Test API endpoints with mocked HTTP responses
- Verify parameter transformation
- Test error handling and retries

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test implementation
    });
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include examples for new features
- Keep documentation clear and concise

## MCP SDK Update Process

When updating the Model Context Protocol SDK (`@modelcontextprotocol/sdk`), follow these steps:

### Before Updating

1. **Check the SDK Release Notes**:
   - Visit the [MCP SDK releases page](https://github.com/modelcontextprotocol/sdk/releases)
   - Review the changelog for breaking changes
   - Note any new protocol versions supported

2. **Assess Impact**:
   - Check if the new SDK version adds support for new protocol versions
   - Review any deprecated features or APIs
   - Evaluate compatibility with existing functionality

### Update Process

1. **Update the Dependency**:

   ```bash
   pnpm add @modelcontextprotocol/sdk@latest
   ```

2. **Update Version References**:
   - Update SDK version in `src/index.ts` startup logging
   - Update supported protocol versions in `COMPATIBILITY.md`
   - Update SDK version in `README.md` if referenced

3. **Test Protocol Compatibility**:

   ```bash
   # Run all tests
   pnpm test

   # Test with Claude Desktop or other MCP clients
   # Verify all tools work correctly
   ```

4. **Update Documentation**:
   - Update `COMPATIBILITY.md` with new protocol versions
   - Document any behavior changes
   - Update examples if APIs have changed

5. **Test with Multiple Clients**:
   - Test with Claude Desktop
   - Test with other MCP clients if available
   - Verify backward compatibility with older protocol versions

### Post-Update Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm check-types`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Documentation is updated
- [ ] COMPATIBILITY.md reflects new protocol support
- [ ] Manual testing confirms all tools work
- [ ] No deprecated SDK features are being used

### Monitoring SDK Updates

To stay informed about SDK updates:

- Watch the [MCP SDK repository](https://github.com/modelcontextprotocol/sdk)
- Subscribe to release notifications
- Review the [MCP specification](https://modelcontextprotocol.io) for protocol changes

## Release Process

1. Ensure all tests pass
2. Update version in package.json
3. Create a pull request
4. After merge, create a release tag
5. GitHub Actions will automatically publish to npm and DockerHub

## Need Help?

- Check the [README](README.md) for general information
- Look at existing code for examples
- Ask questions in GitHub issues
- Review closed PRs for similar changes

## Recognition

Contributors will be recognized in the project documentation. Thank you for helping improve the SonarQube MCP Server!
