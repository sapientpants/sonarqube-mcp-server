#!/usr/bin/env node

/**
 * =============================================================================
 * SCRIPT: Version and Release Manager
 * PURPOSE: Validate changesets and manage version bumps for releases
 * USAGE: Called by main.yml workflow after successful validation
 * OUTPUTS: Sets GitHub Actions outputs for version and changed status
 * =============================================================================
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Execute shell command and return trimmed output
const exec = (cmd) => execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
// eslint-disable-next-line no-console
const log = (msg) => console.log(msg);

async function main() {
  try {
    // =============================================================================
    // CHANGESET DETECTION
    // Check if changesets exist in .changeset directory
    // =============================================================================

    // Look for changeset markdown files (excluding README.md)
    const hasChangesets =
      fs.existsSync('.changeset') &&
      fs.readdirSync('.changeset').some((f) => f.endsWith('.md') && f !== 'README.md');

    if (!hasChangesets) {
      // =============================================================================
      // VALIDATE COMMITS MATCH CHANGESETS
      // Ensure feat/fix commits have corresponding changesets
      // =============================================================================

      // Find the last git tag to determine commit range
      let lastTag = '';
      try {
        lastTag = exec('git describe --tags --abbrev=0');
      } catch {
        // No tags exist yet (first release)
        lastTag = '';
      }

      // Get commits since last tag (or all commits if no tags)
      const commitRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
      const commits = exec(`git log ${commitRange} --pretty=format:"%s"`).split('\n');

      // Check if any commits require a release (feat, fix, perf, refactor)
      const hasReleasableCommits = commits.some((c) =>
        /^(feat|fix|perf|refactor)(\(.+\))?:/.test(c)
      );

      if (!hasReleasableCommits) {
        // No commits that need a release
        log('⏭️ No releasable commits found, skipping release');
        process.exit(0);
      }

      // VALIDATION ERROR: Found releasable commits without changesets
      // This enforces that all features/fixes are documented in changelog
      log('❌ Found releasable commits but no changeset');
      log('Commits that require a changeset:');
      commits
        .filter((c) => /^(feat|fix|perf|refactor)(\(.+\))?:/.test(c))
        .forEach((c) => log(`  - ${c}`));
      log('\nPlease add a changeset by running: pnpm changeset');
      process.exit(1);
    }

    // =============================================================================
    // VERSION MANAGEMENT
    // Apply changesets to bump version and update CHANGELOG.md
    // =============================================================================

    // Get current version from package.json
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const currentVersion = pkg.version;
    log(`Current version: ${currentVersion}`);

    // Apply all pending changesets
    // This updates package.json version and CHANGELOG.md
    exec('pnpm changeset version');

    // Check if version actually changed
    const updatedPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const newVersion = updatedPkg.version;

    if (currentVersion === newVersion) {
      // No version bump needed (e.g., all changesets were --empty)
      log('⏭️ No version change');
      process.exit(0);
    }

    log(`📦 Version changed to: ${newVersion}`);

    // =============================================================================
    // GITHUB ACTIONS OUTPUT
    // Set outputs for workflow to use in subsequent steps
    // =============================================================================

    // Output for GitHub Actions
    // These values are used by main.yml to decide whether to create a release
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=true\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\n`);
    }
  } catch (error) {
    // Error handling with clear message
    // Common errors: permission issues, git conflicts, invalid changesets
    // eslint-disable-next-line no-console
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
