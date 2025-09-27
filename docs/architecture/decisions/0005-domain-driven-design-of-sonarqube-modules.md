# 5. Domain-driven design of SonarQube modules

Date: 2025-06-13

## Status

Accepted

## Context

The SonarQube API surface is extensive, covering various aspects of code quality management including projects, issues, metrics, measures, quality gates, security hotspots, and system administration. Managing all these API endpoints in a single monolithic client class would lead to:

- A large, difficult-to-maintain codebase
- Unclear separation of concerns
- Difficulty in finding and understanding specific functionality
- Challenges in testing individual API areas
- Risk of naming conflicts and confusion between similar operations

## Decision

We will organize the SonarQube client functionality using a domain-driven design approach, where each major API area is encapsulated in its own domain class:

- `ProjectsDomain`: Handles project listing and management
- `IssuesDomain`: Manages code issues and their lifecycle (search, comment, assign, resolve, etc.)
- `MetricsDomain`: Provides access to available metrics
- `MeasuresDomain`: Retrieves component measures and their history
- `QualityGatesDomain`: Manages quality gates and their status
- `HotspotsDomain`: Handles security hotspots
- `SourceDomain`: Provides access to source code and SCM information
- `SystemDomain`: Handles system health and status checks

Each domain class:

- Encapsulates all API methods related to its specific area
- Has its own dedicated test file
- Can evolve independently without affecting other domains
- Provides a clear, focused interface for its functionality

The main `SonarQubeClient` class acts as a facade, instantiating and providing access to all domain classes through properties.

## Consequences

### Positive

- **Clear separation of concerns**: Each domain has a well-defined responsibility
- **Improved maintainability**: Changes to one API area don't affect others
- **Better discoverability**: Developers can easily find functionality by domain
- **Focused testing**: Each domain can be tested in isolation
- **Scalability**: New domains can be added without modifying existing code
- **Type safety**: Domain-specific types and interfaces can be co-located with their domain

### Negative

- **Initial complexity**: More files and classes to manage
- **Potential duplication**: Some common functionality might be duplicated across domains
- **Navigation overhead**: Developers need to know which domain contains specific functionality

### Mitigation

- Use clear, consistent naming conventions for domains
- Document the responsibility of each domain in its class documentation
- Share common functionality through utility functions or base classes where appropriate
