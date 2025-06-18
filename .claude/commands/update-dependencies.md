# Update Dependencies

You are about to update the dependencies of the project. Please follow these steps:

1. **Create a new branch** for the update, e.g., `chore/update-dependencies`.
2. **Update the dependencies** in `package.json` to their latest versions.
3. **Run the installation** command to update the `pnpm-lock.yaml` file.
4. **Test the project** to ensure that everything works with the updated dependencies.
5. **Commit the changes** making sure that the pre-commit hook passes without warnings or errors.
6. **Push the branch** to the remote repository.
7. **Create a pull request** to trigger the CI/CD pipeline.
8. **Wait for the CI/CD pipeline to complete** successfully. Ensure that all tests pass and the build is successful.
9. **Merge the pull request** into the main branch once the CI/CD pipeline has passed. The merge should be done using the "Squash and merge" option to keep the commit history clean and the branch should be deleted after merging.