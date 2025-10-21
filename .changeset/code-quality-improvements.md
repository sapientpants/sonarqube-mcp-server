---
'sonarqube-mcp-server': patch
---

refactor: improve code quality by addressing SonarQube code smells

Improved code readability and maintainability by addressing 7 code smell issues:

- Use `String#replaceAll()` instead of `replace()` with global regex for better clarity
- Convert `forEach()` to `for...of` loop for improved performance and readability
- Use `String.raw` template literal to avoid unnecessary escaping in regex patterns

These changes follow modern JavaScript/TypeScript best practices and reduce technical debt by 30 minutes. No functional changes or breaking changes introduced.
