# Analyze and fix GitHub Issue

Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:

1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Create a detailed plan to address the issue
5. Create a new branch for the fix, e.g., `fix/issue-123`
6. Implement the necessary changes to fix the issue
7. Ensure that any new code is well-documented and follows the project's coding standards
8. Write tests to cover the changes made, if applicable
9. Ensure code passes formatting, linting, type checking, and tests using `pnpm run precommit`
10. Create a descriptive commit message
11. Push and create a PR
12. Wait for code review and address any feedback provided by reviewers.
13. Merge the pull request once it has been approved. Use the "Squash and merge" option to keep the commit history clean.

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
