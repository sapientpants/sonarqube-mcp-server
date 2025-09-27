# Fix SonarQube Issues

Analyze and fix all open issues reported by SonarQube for this project.

## Steps

1. **Connect to SonarQube and Check for Issues**
   - Use the configured SonarQube MCP server
   - Identify the project key (usually matches the repository name)
   - Query all open issues for the project
   - Filter by status: OPEN, CONFIRMED, REOPENED
   - **If no issues found**: Report "✅ No SonarQube issues found!" and exit

2. **Analyze Retrieved Issues**
   - Group by severity: BLOCKER, CRITICAL, MAJOR, MINOR, INFO
   - Categorize by type:
     - Code smells (maintainability issues)
     - Bugs (reliability issues)
     - Vulnerabilities (security issues)
     - Security hotspots (potential security risks)
     - Duplications (code duplication)
   - Report summary of issues found

3. **Create Feature Branch** (only if issues exist)

   ```bash
   git checkout -b fix/sonarqube-issues
   ```

4. **Fix Issues by Priority**
   - Start with BLOCKER severity
   - Then CRITICAL
   - Then MAJOR
   - Then MINOR
   - Finally INFO

5. **For Each Issue**
   - Read the affected file
   - Understand the issue context
   - Apply the recommended fix
   - Verify the fix doesn't break existing functionality

6. **Common Issue Types and Fixes**
   - **Unused variables/imports**: Remove them
   - **Complex functions**: Split into smaller functions
   - **Missing error handling**: Add try-catch blocks
   - **Type safety issues**: Add proper TypeScript types
   - **Security issues**: Sanitize inputs, use secure functions
   - **Code duplication**: Extract common code into functions
   - **Cognitive complexity**: Simplify logic, reduce nesting

7. **Validation**
   - Run `pnpm verify` to ensure all tests pass
   - Run `pnpm lint` to check for linting issues
   - Run `pnpm typecheck` to verify TypeScript

8. **Create Changeset**

   ```bash
   pnpm changeset
   ```

   - Describe the fixes made
   - Use patch version for bug fixes
   - Use minor version for improvements

9. **Commit Changes**

   ```bash
   git add -A
   git commit -m "fix: resolve SonarQube issues

   - Fix [number] code smells
   - Fix [number] bugs
   - Fix [number] vulnerabilities
   - Improve code maintainability and reliability"
   ```

10. **Push Branch**

    ```bash
    git push origin fix/sonarqube-issues
    ```

11. **Create Pull Request**

    ```bash
    gh pr create --title "fix: resolve SonarQube issues" \
      --body "## Summary
    - Fixed all open SonarQube issues for the project
    - Improved code quality, security, and maintainability

    ## Changes
    - ✅ Fixed [X] BLOCKER issues
    - ✅ Fixed [X] CRITICAL issues
    - ✅ Fixed [X] MAJOR issues
    - ✅ Fixed [X] MINOR issues
    - ✅ Fixed [X] INFO issues

    ## Issue Categories
    - 🐛 Bugs: [number] fixed
    - 🔒 Vulnerabilities: [number] fixed
    - 🧹 Code Smells: [number] fixed
    - 📋 Duplications: [number] fixed

    ## Testing
    - All tests passing
    - Linting checks pass
    - TypeScript compilation successful"
    ```

## Example Usage

```bash
# First, ensure SonarQube MCP server is configured
# Then run this command to fix all issues

# The command will:
# 1. Connect to SonarQube and check for issues
# 2. If no issues: exit early with success message
# 3. If issues exist:
#    - Create a new branch
#    - Fix them in priority order
#    - Create a changeset
#    - Commit all changes
#    - Push the branch
#    - Create a PR with all fixes
```

## Notes

- Some issues may be false positives - mark them as such in SonarQube
- Complex refactoring should be done carefully to avoid breaking changes
- Always run tests after fixing issues
- Consider fixing related issues together for better code organization
- The PR will need review before merging to main
- If no issues are found, no branch or PR will be created
