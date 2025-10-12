# 23. Release Management with Changesets

Date: 2025-10-11

## Status

Accepted

## Context

The SonarQube MCP Server requires a systematic approach to version management, changelog generation, and release automation. Manual versioning and changelog maintenance are error-prone and time-consuming. The project needs:

- Automated semantic versioning based on change significance
- Human-readable changelogs generated from commit history
- Integration with GitHub releases for public visibility
- Prevention of releases without documented changes
- Developer-friendly workflow for documenting changes
- Support for multiple contributors documenting changes simultaneously

Traditional approaches have limitations:

- **Manual versioning**: Error-prone, requires manual package.json updates
- **Conventional commits alone**: Doesn't capture change intent or impact
- **Standard-version/semantic-release**: Less flexible, harder to customize changelog format
- **Manual changelogs**: Time-consuming, inconsistent format, often outdated

## Decision

We will use **Changesets** (@changesets/cli) for release management, version control, and changelog generation.

### Core Workflow

1. **Developer creates changeset** when making impactful changes:

   ```bash
   pnpm changeset
   ```

   - Interactive CLI prompts for change type (major/minor/patch)
   - Developer writes human-readable summary
   - Creates markdown file in `.changeset/` directory

2. **CI/CD validates changesets** on pull requests:
   - Custom script (`.github/scripts/version-and-release.js`) checks for changesets
   - Fails if feat/fix commits exist without corresponding changesets
   - Ensures all significant changes are documented

3. **Automated versioning** on main branch:
   - Script determines version bump from accumulated changesets
   - Updates `package.json` version
   - Generates/updates `CHANGELOG.md` with all changeset summaries
   - Commits changes with `[skip actions]` to prevent workflow recursion

4. **Release creation**:
   - GitHub Actions creates Git tag
   - Creates GitHub release with changelog excerpt
   - Publishes to NPM and Docker registries

### Configuration

**.changeset/config.json**:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": [
    "changelog-github-custom",
    {
      "repo": "sapientpants/sonarqube-mcp-server"
    }
  ],
  "commit": false,
  "access": "public",
  "baseBranch": "main"
}
```

**Key settings**:

- `changelog-github-custom`: Custom GitHub changelog generator
- `commit: false`: CI handles commits (prevents double-commits)
- `access: public`: NPM package is public
- `baseBranch: main`: Releases from main branch only

### Changeset Types

**Major (breaking changes)**:

```bash
pnpm changeset
# Select: major
# Example: "Renamed `health()` to `getHealthV2()` (breaking API change)"
```

**Minor (new features)**:

```bash
pnpm changeset
# Select: minor
# Example: "Added support for multi-platform Docker images"
```

**Patch (bug fixes, docs, chores)**:

```bash
pnpm changeset
# Select: patch
# Example: "Fixed Docker publishing permissions issue"
```

### Validation Logic

The custom validation script (`.github/scripts/version-and-release.js`) enforces:

1. **Commit type analysis**: Checks commit messages for `feat:` or `fix:` prefixes
2. **Changeset requirement**: Fails if feat/fix commits exist without changesets
3. **Version determination**: Aggregates changesets to determine final version bump
4. **Outputs**: Sets GitHub Actions outputs for downstream jobs

**Example validation failure**:

```
Error: Found feat/fix commits without changesets:
  - feat: add new tool for hotspot analysis
  - fix: resolve authentication timeout issue

Please create changesets with: pnpm changeset
```

### CI/CD Integration

**Main workflow (.github/workflows/main.yml)**:

```yaml
- name: Version packages
  id: version
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    node .github/scripts/version-and-release.js

- name: Commit version changes
  if: steps.version.outputs.changed == 'true'
  run: |
    git config --local user.email "${{ github.actor_id }}+${{ github.actor }}@users.noreply.github.com"
    git config --local user.name "${{ github.actor }}"
    git add package.json CHANGELOG.md .changeset
    git commit -m "chore(release): v${{ steps.version.outputs.version }} [skip actions]"
    git push origin main
```

**PR workflow (.github/workflows/pr.yml)**:

```yaml
- name: Check for changesets
  run: |
    node .github/scripts/version-and-release.js
    # Fails PR if changesets missing for feat/fix commits
```

## Consequences

### Positive

- **Semantic Versioning**: Automatic version bumps based on change impact
- **Human-Readable Changelogs**: Developers write clear summaries, not parsing commits
- **Change Documentation**: Every significant change documented before merge
- **Parallel Development**: Multiple contributors can add changesets simultaneously
- **GitHub Integration**: Custom formatter creates GitHub-friendly changelogs
- **Release Automation**: Complete automation from changeset to GitHub release
- **Flexibility**: Custom validation script enforces project-specific rules
- **Monorepo Ready**: Changesets scales to monorepos (though not needed here)
- **Review-Friendly**: Changesets visible in PR for review
- **Version Planning**: Aggregate view of pending version bump

### Negative

- **Extra Step**: Developers must remember to create changesets
- **Learning Curve**: New contributors need to learn changeset workflow
- **CI Complexity**: Custom validation script adds maintenance burden
- **Commit Noise**: Creates `.changeset/*.md` files in version control
- **Manual Intervention**: Sometimes requires manual conflict resolution in CHANGELOG.md
- **Validation Strictness**: May block non-impactful PRs if validation is too strict

### Neutral

- **Commit Message Format**: Still benefits from conventional commits for context
- **Multiple Files**: Changesets create multiple small markdown files
- **Git History**: Version bump commits separate from feature commits
- **Changeset Cleanup**: `.changeset/*.md` files deleted after version bump

## Implementation

### Developer Workflow

**Adding a changeset**:

```bash
# 1. Make your code changes
git add .

# 2. Create a changeset (before committing)
pnpm changeset

# Interactive prompts:
# - Select change type (major/minor/patch)
# - Write summary: Clear, user-facing description
# - Confirm

# 3. Commit everything together
git commit -m "feat: add new feature

This adds support for...

Closes #123"

# Changeset is now part of the PR
```

**Example changeset file** (`.changeset/cool-feature.md`):

```markdown
---
'sonarqube-mcp-server': minor
---

Added support for security hotspot status updates through new MCP tool
```

### Maintainer Workflow

**Releasing a version**:

1. Merge PRs with changesets to main
2. CI automatically:
   - Aggregates changesets
   - Bumps version in package.json
   - Updates CHANGELOG.md
   - Commits and pushes
   - Creates Git tag
   - Creates GitHub release
   - Publishes to registries

**Manual release** (rare):

```bash
# Generate version bump and changelog
pnpm changeset version

# Review changes
git diff package.json CHANGELOG.md

# Commit
git add -A
git commit -m "chore(release): version packages"

# Create tag
git tag -a "v$(node -p "require('./package.json').version")" -m "Release"

# Push
git push && git push --tags
```

### Handling Empty Changesets

For non-impactful changes (docs, tests, refactoring), create an empty changeset:

```bash
pnpm changeset --empty
```

This satisfies validation without bumping version or adding changelog entry.

### Changeset Status

Check pending changesets:

```bash
pnpm changeset status

# Output:
# Changes to be included in next release:
#   minor: Added security hotspot tools
#   patch: Fixed authentication timeout
#   patch: Updated documentation
#
# Suggested version bump: minor (current: 1.10.18, next: 1.11.0)
```

## Examples

### Example 1: Adding a Feature

**Pull request with changeset**:

File: `.changeset/add-quality-gate-tool.md`

```markdown
---
'sonarqube-mcp-server': minor
---

Added new `quality_gate_status` tool to check project quality gate status directly from the MCP server
```

**Generated CHANGELOG.md entry**:

```markdown
## 1.11.0

### Minor Changes

- abc1234: Added new `quality_gate_status` tool to check project quality gate status directly from the MCP server
```

### Example 2: Fixing a Bug

**Pull request with changeset**:

File: `.changeset/fix-docker-permissions.md`

```markdown
---
'sonarqube-mcp-server': patch
---

Fixed Docker publishing workflow failing due to missing `packages:write` permission
```

**Generated CHANGELOG.md entry**:

```markdown
## 1.10.19

### Patch Changes

- def5678: Fixed Docker publishing workflow failing due to missing `packages:write` permission
```

### Example 3: Multiple Changes

**Three PRs merged with changesets**:

1. `.changeset/feat-hotspots.md` (minor)
2. `.changeset/fix-auth.md` (patch)
3. `.changeset/docs-update.md` (patch)

**Resulting version bump**: 1.10.18 → 1.11.0 (minor wins)

**Generated CHANGELOG.md**:

```markdown
## 1.11.0

### Minor Changes

- abc1234: Added security hotspot management tools with status update capabilities

### Patch Changes

- def5678: Fixed authentication timeout in circuit breaker
- ghi9012: Updated API documentation with new examples
```

## References

- Changesets Documentation: https://github.com/changesets/changesets
- Configuration: .changeset/config.json
- Validation Script: .github/scripts/version-and-release.js
- CI/CD Integration: .github/workflows/main.yml
- Changelog Format: changelog-github-custom package
- Package Scripts: package.json (changeset, changeset:status commands)
