---
'sonarqube-mcp-server': minor
---

feat: add Docker build and Trivy security scanning to CI/CD pipeline

- Add Docker image building and vulnerability scanning to PR workflow for shift-left security
- Build multi-platform Docker images in main workflow and store as artifacts
- Refactor publish workflow to use pre-built images from main for deterministic deployments
- Create reusable Docker workflow for consistent build and scan process
- Add Trivy container scanning with results uploaded to GitHub Security tab
- Control Docker features via single `ENABLE_DOCKER_RELEASE` repository variable
- Add .dockerignore to optimize build context
- Support for linux/amd64 and linux/arm64 platforms
