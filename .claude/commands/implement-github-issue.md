# Implement GitHub Issue

You are about to implement GitHub issue: $ARGUMENTS

## Implementation Workflow

### 1. Analyze the Issue

```bash
gh issue view $ARGUMENTS
```

- Review the full issue description
- If it contains Gherkin specs, parse acceptance criteria carefully
- Identify non-goals and constraints
- Note any technical requirements

### 2. Research Codebase

- Search for relevant existing code
- Identify files needing modification
- Look for similar patterns to maintain consistency
- Review existing tests for patterns

### 3. Plan Implementation

Create a plan with:

- Core functionality breakdown
- Test strategy (unit + property-based)
- Files to create/modify
- Edge cases and risks

### 4. Create Feature Branch

```bash
# Follow branch naming from CLAUDE.md
git checkout -b <type>/<issue-number>-<description>
# Example: feat/42-user-authentication
```

### 5. Implement Solution

- Follow patterns in CLAUDE.md (validation, testing, imports)
- Write clean, focused functions
- Add TypeScript types and Zod validation
- Document public APIs with JSDoc

### 6. Write Tests

Required test coverage:

- **Unit tests** in `tests/*.spec.ts`
- **Property-based tests** in `tests/*.property.spec.ts` for business logic
- Test both success and failure cases
- Verify edge cases

### 7. Verify Quality

```bash
pnpm verify  # Runs all checks
```

### 8. Create Changeset

**Changeset Guidance for Features:**

```bash
# For bug fixes
pnpm changeset
# Select: patch
# Message: "Fix: [brief description of what was fixed]"

# For new features
pnpm changeset
# Select: minor
# Message: "Add [feature name]: [brief description]"

# For breaking changes
pnpm changeset
# Select: major
# Message: "BREAKING: [what changed and migration required]"

# For non-code changes (docs, tests, refactoring)
pnpm changeset --empty
# Message: "Internal: [what was changed]"
```

**Decision Guide:**

- **patch**: Bug fixes, security patches, performance improvements
- **minor**: New features, new APIs, significant enhancements
- **major**: Breaking changes, API removals, incompatible updates
- **--empty**: Documentation, tests, CI/CD, internal refactoring

### 9. Commit Changes

```bash
git add .
git commit -m "<type>: <description>

<body-if-needed>

Closes #<issue-number>"
```

### 10. Create Pull Request

```bash
git push -u origin <branch-name>

gh pr create \
  --title "<type>: <description>" \
  --body "## Summary
  <what-and-why>

  ## Changes
  - <list-changes>

  ## Testing
  - <how-tested>

  Closes #<issue-number>" \
  --assignee @me
```

### 11. Monitor CI

```bash
gh pr checks --watch
```

### 12. Address Feedback

- Respond to review comments
- Make requested changes
- Re-verify after changes

### 13. Merge PR

```bash
# After approval and passing checks
gh pr merge --squash --delete-branch
```

## Key Points

- **Follow coding standards** in CLAUDE.md
- **Test thoroughly** - Unit + property-based tests required
- **Use changesets** for version management
- **Conventional commits** for clear history
- **Quality first** - All checks must pass

## Success Checklist

Before completing:

- [ ] All acceptance criteria met
- [ ] Tests comprehensive (unit + property)
- [ ] `pnpm verify` passes
- [ ] Documentation updated
- [ ] Changeset created and up to date
- [ ] PR reviewed and approved

See CLAUDE.md for detailed patterns, troubleshooting, and coding standards.
