# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-05-28

### Added
- File-based logging system for debugging with configurable log levels
- Logger utility with context support and structured logging

### Changed
- Replaced custom REST API implementation with `sonarqube-web-api-client` package
- Improved code structure to reduce cognitive complexity
- Updated all dependencies to latest versions
- Enhanced error handling with better error formatting in logs

### Fixed
- Resolved all SonarQube code quality issues
- Fixed high cognitive complexity in `getIssues` method
- Replaced logical OR operators with nullish coalescing operators throughout codebase
- Fixed nested template literal issues

### Developer Experience
- Improved testability with dependency injection patterns
- Better type safety with reduced use of type assertions
- Enhanced code maintainability with extracted helper methods

## [1.1.0] - 2025-03-22

### Added
- Source Code API capabilities for viewing code with issue annotations
- SCM blame information support
- Quality Gates API for retrieving quality gate definitions and project status
- Pull request support in Issues API
- Hotspots parameter support

### Changed
- Enhanced API parameter handling for better flexibility
- Improved test coverage across all modules

## [1.0.1] - 2025-03-09

### Fixed
- Replaced logical OR with nullish coalescing operator for better null handling
- Various code quality improvements

### Changed
- Updated dependencies to latest versions

## [1.0.0] - 2025-03-07

### Added
- Initial release with core SonarQube MCP server functionality
- Support for Projects API
- Support for Issues API with comprehensive filtering
- Support for Metrics API
- Support for System API (health, status, ping)
- Support for Measures API for component metrics
- Environment-based configuration
- Comprehensive test suite with high coverage