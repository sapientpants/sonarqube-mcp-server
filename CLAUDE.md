# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

See [README.md](./README.md) for the complete project overview, features, and usage documentation.

## Architecture Decision Records (ADRs)

This project uses adr-tools to document architectural decisions. ADRs are stored in `doc/architecture/decisions/`.

```bash
# Create a new ADR without opening an editor (prevents timeout in Claude Code)
EDITOR=true adr-new "Title of the decision"

# Then edit the created file manually
```

All architectural decisions are documented in Architecture Decision Records (ADRs) located in `doc/architecture/decisions/`. These ADRs are the single source of truth for understanding the design and architecture of this library.

Refer to the ADRs for detailed information about design rationale, implementation details, and consequences of each architectural decision.

## Code Quality Conventions

Follow these conventions to maintain code quality:

### TypeScript Best Practices

1. **Use Type Aliases for Union Types**

   ```typescript
   // ❌ Avoid repeated union types
   function foo(param: 'option1' | 'option2' | 'option3') {}
   function bar(param: 'option1' | 'option2' | 'option3') {}

   // ✅ Use type alias
   type MyOptions = 'option1' | 'option2' | 'option3';
   function foo(param: MyOptions) {}
   function bar(param: MyOptions) {}
   ```

2. **Use Nullish Coalescing Operator**

   ```typescript
   // ❌ Avoid logical OR for defaults (can fail with falsy values)
   const value = input || 'default';

   // ✅ Use nullish coalescing (only replaces null/undefined)
   const value = input ?? 'default';
   ```

3. **Use Object Spread Instead of Object.assign**

   ```typescript
   // ❌ Avoid Object.assign
   const merged = Object.assign({}, obj1, obj2);

   // ✅ Use object spread
   const merged = { ...obj1, ...obj2 };
   ```

4. **Avoid Deprecated APIs**
   - Check for deprecation warnings in the IDE
   - Use recommended replacements (e.g., `getHealthV2()` instead of `health()`)
   - Update to newer API versions when available

### Code Complexity

1. **Keep Cognitive Complexity Low**
   - Maximum cognitive complexity: 15
   - Break complex functions into smaller, focused functions
   - Reduce nesting levels
   - Simplify conditional logic

2. **Remove Redundant Code**
   - Don't create type aliases for primitive types
   - Remove unused variable assignments
   - Eliminate dead code

### Regular Expressions

1. **Make Regex Operator Precedence Explicit**

   ```typescript
   // ❌ Ambiguous precedence
   /abc|def+/

   // ✅ Clear precedence with grouping
   /abc|(def+)/
   ```

### General Guidelines

1. **Follow Existing Patterns**
   - Check how similar functionality is implemented in the codebase
   - Maintain consistency with existing code style
   - Use the same libraries and utilities as the rest of the project

2. **Run Validation Before Committing**

   ```bash
   # Run all checks before committing
   pnpm run precommit

   # This includes:
   # - Format checking (prettier)
   # - Linting (eslint)
   # - Type checking (tsc)
   # - Tests
   ```

## Claude-Specific Tips

- Remember to use the ADR creation command with `EDITOR=true` to prevent timeouts in Claude Code
- Never use `--no-verify` when committing code. This bypasses pre-commit hooks which run important validation checks
- Run `pnpm format` to format code before committing
- Run `pnpm run precommit` before finalizing any code changes
- Documentation for sonarqube-web-api-client can be retrieved from <https://raw.githubusercontent.com/sapientpants/sonarqube-web-api-client/refs/heads/main/docs/LLM.md>

## Updating pnpm Version

When updating the pnpm version in this project, you MUST update it in ALL of the following locations to maintain consistency:

1. **package.json**: Update the `packageManager` field (e.g., `"packageManager": "pnpm@10.17.0"`)
2. **Dockerfile**: Update the version in `RUN npm install -g pnpm@10.17.0`
3. **Documentation files**:
   - **README.md**: Update the Prerequisites section
   - **CONTRIBUTING.md**: Update the Prerequisites section
4. **Setup script**: Update `scripts/setup.sh` for mise installation
5. **GitHub Actions workflows** (CRITICAL - these must match package.json exactly):
   - `.github/workflows/main.yml`: Line with `version: 10.17.0`
   - `.github/workflows/pr.yml`: Line with `version: 10.17.0`
   - `.github/workflows/publish.yml`: `PNPM_VERSION` environment variable
   - `.github/workflows/reusable-security.yml`: Default value for `pnpm-version` input
   - `.github/workflows/reusable-validate.yml`: Default value for `pnpm-version` input

**Important**: If package.json and GitHub workflows have different pnpm versions, the CI/CD pipeline will fail with an error like:

```
Error: Multiple versions of pnpm specified:
  - version X in the GitHub Action config with the key "version"
  - version pnpm@Y in the package.json with the key "packageManager"
```

Always search for the old version number across all files to ensure no location is missed.

## Memory

Follow these steps for each interaction:

1. User Identification:
   - You should assume that you are interacting with default_user
   - If you have not identified default_user, proactively try to do so.

2. Memory Retrieval:
   - Always begin your chat by saying only "Remembering..." and retrieve all relevant information from your knowledge graph
   - Always refer to your knowledge graph as your "memory"

3. Memory Gathering:
   - While conversing with the user, be attentive to any new information that falls into these categories:
     a) Basic Identity (age, gender, location, job title, education level, etc.)
     b) Behaviors (interests, habits, etc.)
     c) Preferences (communication style, preferred language, etc.)
     d) Goals (goals, targets, aspirations, etc.)
     e) Relationships (personal and professional relationships up to 3 degrees of separation)

4. Memory Update:
   - If any new information was gathered during the interaction, update your memory as follows:
     a) Create entities for recurring entities (people, places, organizations, modules, concepts, etc.)
     b) Connect them to the current entities using relations
     c) Store facts about them as observations
