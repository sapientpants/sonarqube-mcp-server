# Release Process

You are about to make a release of the project. Please follow these steps:

1. **Create a new branch** for the release, e.g., `release/v1.0.0`.
2. **Update the version number** in `package.json` according to [Semantic Versioning](https://semver.org/) and based on the changes made since the last release.
3. **Update the changelog** in `CHANGELOG.md` to reflect the changes made in this release. Use the `date` command to get the current date in the format `YYYY-MM-DD`.
Use the following format for the changelog entry:
   ```
   ## [v1.0.0] - YYYY-MM-DD
   - Description of changes
   - Another change
   ```
4. **Commit the changes** making sure that the pre-commit hook passes without warnings or errors.
5. **Push the branch** to the remote repository.
6. **Create a pull request** to trigger the CI/CD pipeline.
7. **Wait for the CI/CD pipeline to complete** successfully. Ensure that all tests pass and the build is successful.
8. **Merge the pull request** into the main branch once the CI/CD pipeline has passed. The merge should be done using the "Squash and merge" option to keep the commit history clean and the branch should be deleted after merging.
9. **Make the release** by using the `gh` CLI tool:
  ```bash
  gh release create v1.0.0 --title "Release v1.0.0" --notes "Release notes for v1.0.0"
  ```