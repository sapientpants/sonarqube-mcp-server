# 11. Docker containerization for deployment

Date: 2025-06-13

## Status

Accepted

## Context

The SonarQube MCP server needs to be easily deployable across different environments with consistent behavior. Users require a simple deployment method that:

- Eliminates dependency management issues (Node.js version, npm packages)
- Ensures consistent runtime environments across different systems
- Simplifies the deployment process for non-technical users
- Supports various MCP transport mechanisms (stdio, SSE)
- Enables easy updates and version management

## Decision

We will provide Docker containerization as a recommended deployment option for the SonarQube MCP server. This includes:

- Maintaining a Dockerfile in the repository that packages the server with all dependencies
- Publishing Docker images to Docker Hub (e.g., sapientpants/sonarqube-mcp-server)
- Documenting Docker usage in the README as a primary deployment method
- Supporting both stdio and SSE transports within the containerized environment

The Dockerfile will:

- Use an appropriate Node.js base image
- Install all npm dependencies
- Copy the built server code
- Set appropriate entry points for MCP server operation

## Consequences

### Positive

- **Simplified deployment**: Users can run the server with a single `docker run` command
- **Dependency isolation**: All Node.js and npm dependencies are packaged within the container
- **Version consistency**: Specific server versions can be deployed using Docker tags
- **Cross-platform compatibility**: Works identically on Linux, macOS, and Windows with Docker
- **Easy updates**: Users can update by pulling new image versions
- **Transport flexibility**: Both stdio and SSE transports work within containers

### Negative

- **Additional maintenance**: Requires maintaining Dockerfile and Docker Hub releases
- **Image size**: Docker images are larger than source distributions (includes Node.js runtime)
- **Docker requirement**: Users must have Docker installed and running
- **Resource overhead**: Containers have slight performance overhead compared to native execution

### Neutral

- Docker deployment becomes the recommended approach but not mandatory - users can still install from source
- Need to ensure Docker image tags align with npm package versions for consistency
