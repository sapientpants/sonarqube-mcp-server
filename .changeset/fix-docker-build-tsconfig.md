---
'sonarqube-mcp-server': patch
---

fix: add missing tsconfig.build.json to Docker build

Fix Docker build failure by copying tsconfig.build.json to the container. The build script requires tsconfig.build.json but it was not being copied during the Docker build process, causing the build to fail with error TS5058.

**Changes:**

- Update Dockerfile to copy both tsconfig.json and tsconfig.build.json
- Ensures TypeScript build process has access to the production build configuration
- Resolves Docker build failure: "error TS5058: The specified path does not exist: 'tsconfig.build.json'"

**Testing:**

- Verified local build works correctly
- Confirmed Docker build completes successfully
- No changes to build output or functionality
