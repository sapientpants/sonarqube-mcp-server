# Update Dependencies

You are about to update the dependencies of the project. This command helps maintain the project's dependencies while adhering to the established CI/CD workflow and changeset requirements.

## Workflow Steps

### 1. Create a Feature Branch

Create a new branch following the naming convention:

```bash
git checkout -b chore/update-dependencies-<date>
# Example: chore/update-dependencies-2024-01
```

### 2. Update Dependencies

#### For Production Dependencies:

```bash
# Check outdated packages
pnpm outdated

# Update all dependencies to latest
pnpm update --latest

# Or update specific packages
pnpm update <package-name> --latest
```

#### For Dev Dependencies:

```bash
# Update dev dependencies
pnpm update --latest --dev
```

### 3. Install and Lock Dependencies

```bash
# Ensure pnpm-lock.yaml is updated
pnpm install

# Deduplicate dependencies if needed
pnpm dedupe
```

### 4. Test the Updates

Run the full verification suite to ensure compatibility:

```bash
# Run all checks (audit, typecheck, lint, format, test)
pnpm verify

# Run specific checks if needed
pnpm test
pnpm typecheck
pnpm lint
```

### 5. Create a Changeset

**IMPORTANT**: The CI/CD pipeline requires changesets for all changes. Choose the right type based on impact:

#### When to Use Empty Changeset

Use `pnpm changeset --empty` for changes that don't affect users:

- Dev dependency updates only
- CI/CD configuration changes
- Test-only improvements
- Internal tooling updates
- Documentation changes

```bash
# Create an empty changeset (no version bump)
pnpm changeset --empty

# The changeset message should document:
# - Which dependencies were updated
# - Why they were updated
# - Any tooling changes developers should know about
```

#### When to Use Regular Changeset

Use `pnpm changeset` for changes that affect the package/application:

- Production dependency updates
- Security fixes visible to users
- Breaking changes in dependencies
- Bug fixes from dependency updates
- New features from dependency updates

```bash
# Create a proper changeset (will bump version)
pnpm changeset

# Select version bump:
# - patch: security updates, bug fixes, minor dependency updates
# - minor: significant updates with new capabilities
# - major: breaking changes requiring user action

# Examples:
# patch: "Update zod to fix validation edge case"
# minor: "Update Pino with new structured logging features"
# major: "Update to Node 24 (drops Node 22 support)"
```

### 6. Commit the Changes

Follow conventional commit format:

```bash
git add .

# For routine updates
git commit -m "chore: update dependencies

- Updated production dependencies to latest versions
- Updated dev dependencies to latest versions
- No breaking changes identified"

# For updates with notable changes
git commit -m "chore: update dependencies with <notable-package> v<version>

- Updated <package> from v<old> to v<new>
- <List any important changes>
- All tests passing"
```

### 7. Push and Create Pull Request

```bash
# Push the branch
git push -u origin chore/update-dependencies-<date>

# Create PR with detailed description
gh pr create \
  --title "chore: update dependencies" \
  --body "## Summary
  Updates all dependencies to their latest versions.

  ## Changes
  - Production dependencies updated
  - Dev dependencies updated
  - No breaking changes identified

  ## Testing
  - ✅ All tests passing
  - ✅ Type checking successful
  - ✅ Linting clean
  - ✅ Coverage maintained at 80%+

  ## Changeset
  - [x] Empty changeset added for dev dependency updates" \
  --assignee @me
```

### 8. Monitor CI/CD Pipeline

```bash
# Watch the PR checks
gh pr checks --watch

# View detailed CI logs if needed
gh run list
gh run view <run-id>
```

### 9. Merge the Pull Request

Once all checks pass:

```bash
# Squash and merge (maintains clean history)
gh pr merge --squash --delete-branch

# Or merge through GitHub UI with "Squash and merge"
```

## Important Notes

### Changeset Requirements

- **Dev dependencies only**: Use `pnpm changeset --empty` to satisfy CI requirements
- **Production dependencies**: Create a proper changeset with appropriate version bump
- **Mixed updates**: Use proper changeset and document both types

### Common Issues and Solutions

#### CI Fails Due to Missing Changeset

```bash
# Add an empty changeset if you forgot
pnpm changeset --empty
git add .
git commit --amend
git push --force-with-lease
```

#### Breaking Changes in Dependencies

1. Review the changelog of the updated package
2. Update code to accommodate changes
3. Add tests for affected functionality
4. Use minor or major version bump in changeset

#### Audit Vulnerabilities

```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically if possible
pnpm audit --fix

# For critical vulnerabilities that can't be auto-fixed,
# document in PR and consider alternatives
```

### Security Considerations

- Always run `pnpm audit` after updates
- Review security advisories for updated packages
- Be cautious with major version updates
- Consider the security track record of new dependencies
