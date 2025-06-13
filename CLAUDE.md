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

Based on resolved SonarQube issues, follow these conventions to maintain code quality:

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

5. **Keep Cognitive Complexity Low**
   - Maximum cognitive complexity: 15
   - Break complex functions into smaller, focused functions
   - Reduce nesting levels
   - Simplify conditional logic

6. **Remove Redundant Code**
   - Don't create type aliases for primitive types
   - Remove unused variable assignments
   - Eliminate dead code

### Regular Expressions

7. **Make Regex Operator Precedence Explicit**
   ```typescript
   // ❌ Ambiguous precedence
   /abc|def+/
   
   // ✅ Clear precedence with grouping
   /abc|(def+)/
   ```

### General Guidelines

8. **Follow Existing Patterns**
   - Check how similar functionality is implemented in the codebase
   - Maintain consistency with existing code style
   - Use the same libraries and utilities as the rest of the project

9. **Run Validation Before Committing**
   ```bash
   # Run all checks before committing
   pnpm run ci
   
   # This includes:
   # - Format checking (prettier)
   # - Linting (eslint)
   # - Type checking (tsc)
   # - Tests
   ```

## Claude-Specific Tips

- Remember to use the ADR creation command with `EDITOR=true` to prevent timeouts in Claude Code
- Use `jq` to read json files when analyzing test results or configuration
- Never use `--no-verify` when committing code. This bypasses pre-commit hooks which run important validation checks
- Always check for existing patterns before implementing new functionality
- Run `pnpm validate` before finalizing any code changes
