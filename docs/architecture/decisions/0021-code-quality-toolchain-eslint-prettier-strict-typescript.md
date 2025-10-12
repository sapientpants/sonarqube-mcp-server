# 21. Code Quality Toolchain ESLint Prettier Strict TypeScript

Date: 2025-10-11

## Status

Accepted

## Context

The SonarQube MCP Server requires high code quality to ensure maintainability, reliability, and consistency across contributions. A comprehensive code quality toolchain is needed to:

- Enforce consistent code style across the codebase
- Catch potential bugs and code smells early
- Leverage TypeScript's type system to maximum effect
- Automate quality checks in development and CI/CD
- Reduce manual code review burden
- Prevent low-quality code from reaching production

Manual code review alone is insufficient for maintaining quality standards, especially as the codebase grows and more contributors join.

## Decision

We will implement a comprehensive code quality toolchain consisting of:

### 1. TypeScript with Strict Configuration

**Configuration** (tsconfig.json):

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Key Features**:

- `strict`: Enables all strict type checking options
- `noUncheckedIndexedAccess`: Requires checking for undefined when accessing arrays/objects by index
- `exactOptionalPropertyTypes`: Distinguishes between `undefined` and missing properties
- `noImplicitOverride`: Requires explicit `override` keyword for inherited methods
- `noFallthroughCasesInSwitch`: Prevents unintentional switch fallthrough

### 2. ESLint for Code Linting

**Configuration** (eslint.config.js with flat config):

- @typescript-eslint/eslint-plugin for TypeScript-specific rules
- eslint-config-prettier to disable conflicting rules
- eslint-plugin-prettier to run Prettier as an ESLint rule
- eslint-plugin-jsonc for JSON/JSONC linting
- Custom rules enforcing project conventions

**Key Rules**:

- Maximum cognitive complexity: 15
- Prefer `const` over `let`
- Prefer template literals over string concatenation
- Require explicit return types on exported functions
- No unused variables or imports
- Consistent naming conventions

### 3. Prettier for Code Formatting

**Configuration** (.prettierrc):

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Features**:

- Consistent code formatting across all files
- Formats TypeScript, JavaScript, JSON, Markdown, YAML
- Integrated with ESLint to avoid conflicts
- Automatic formatting on save (via editor integration)

### 4. Pre-commit Hooks with Husky

**Configuration** (.husky/pre-commit):

```bash
#!/usr/bin/env sh
pnpm precommit
```

**Pre-commit checks**:

```bash
pnpm precommit:
  - pnpm audit --audit-level critical
  - pnpm typecheck
  - pnpm lint
  - pnpm lint:workflows (actionlint)
  - pnpm lint:markdown
  - pnpm lint:yaml
  - pnpm format
  - pnpm test
```

### 5. Lint-staged for Performance

Only lints files that are staged for commit:

```json
{
  "*.{ts,tsx,js,json,md,yml,yaml}": ["prettier --write"],
  "*.{ts,tsx,js,json,jsonc,json5}": ["eslint --fix"],
  "*.md": ["markdownlint-cli2 --fix"],
  "*.{yml,yaml}": ["yamllint"]
}
```

## Consequences

### Positive

- **Consistent Code Style**: Prettier ensures uniform formatting across the codebase
- **Early Bug Detection**: TypeScript strict mode and ESLint catch errors before runtime
- **Type Safety**: Strict TypeScript configuration prevents common type-related bugs
- **Automated Quality**: Pre-commit hooks prevent low-quality code from being committed
- **Reduced Review Time**: Automated checks handle style and common issues
- **Confidence in Refactoring**: Strong typing enables safe refactoring
- **Better IDE Support**: Strict typing provides better autocomplete and error detection
- **Onboarding**: New contributors immediately follow project standards

### Negative

- **Initial Setup Complexity**: Multiple tools require configuration
- **Slower Commits**: Pre-commit hooks add time to the commit process (~30 seconds)
- **Learning Curve**: Strict TypeScript can be challenging for beginners
- **False Positives**: Occasionally requires `eslint-disable` comments
- **Configuration Maintenance**: Tools require updates and rule adjustments

### Neutral

- **Opinionated Decisions**: Some style choices may not match personal preferences
- **Tool Ecosystem**: Requires keeping multiple tools in sync
- **CI/CD Integration**: Same checks run in CI, adding pipeline time

## Implementation

### Installation

All tools are configured as dev dependencies:

```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.46.0",
    "@typescript-eslint/parser": "^8.46.0",
    "eslint": "^9.37.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.4",
    "prettier": "^3.6.2",
    "husky": "^9.1.7",
    "lint-staged": "^16.2.4",
    "markdownlint-cli2": "0.18.1",
    "yaml-lint": "1.7.0"
  }
}
```

### Usage

**Development workflow**:

```bash
# Run all quality checks
pnpm precommit

# Individual checks
pnpm typecheck          # Type checking
pnpm lint               # ESLint
pnpm lint:fix           # Auto-fix ESLint issues
pnpm format             # Check Prettier formatting
pnpm format:fix         # Auto-format with Prettier
```

**CI/CD Integration**:
Quality checks run in parallel in the CI pipeline (see ADR-0024).

### Enforcement

1. **Pre-commit hooks**: Block commits with quality issues
2. **CI/CD pipeline**: Fail builds with quality issues
3. **Required status checks**: PR cannot merge without passing checks
4. **SonarCloud**: Additional continuous code quality analysis

## Examples

### Before (without tooling):

```typescript
function foo(x) {
  if (x) {
    if (x.bar) {
      if (x.bar.baz) {
        return x.bar.baz.qux;
      }
    }
  }
  return null;
}
```

### After (with tooling):

```typescript
function foo(x: unknown): string | undefined {
  if (
    x &&
    typeof x === 'object' &&
    'bar' in x &&
    x.bar &&
    typeof x.bar === 'object' &&
    'baz' in x.bar
  ) {
    return x.bar.baz?.qux;
  }
  return undefined;
}
```

## References

- TypeScript Strict Mode: https://www.typescriptlang.org/tsconfig#strict
- ESLint Configuration: eslint.config.js
- Prettier Configuration: .prettierrc
- Pre-commit Hooks: .husky/pre-commit
- SonarCloud Analysis: https://sonarcloud.io/project/overview?id=sonarqube-mcp-server
