/// SonarQube integration for the MCP server.
///
/// This module contains functionality for connecting to and interacting with SonarQube servers
/// via their REST API. It provides:
///
/// - Types and structures for SonarQube API requests and responses
/// - Client functionality for making authenticated requests to SonarQube servers
/// - MCP tools that expose SonarQube functionality to MCP clients
///
/// The integration allows MCP clients to access SonarQube project quality metrics,
/// issues, quality gates, and other information through a standardized interface.
pub mod client;

/// Server context for dependency injection.
///
/// This module provides a centralized container for server dependencies,
/// enabling proper dependency injection throughout the codebase.
pub mod context;

/// Type definitions for SonarQube API integration.
///
/// This module contains the data structures for SonarQube API requests and responses,
/// as well as the MCP tool parameter and result types.
pub mod types;

/// Query building utilities for SonarQube API requests.
///
/// This module provides a query builder pattern for constructing URL parameters
/// for SonarQube API requests in a structured and maintainable way.
pub mod query;

/// Configuration for SonarQube integration.
///
/// This module contains environment variable definitions and
/// configuration-related utilities for the SonarQube integration.
pub mod config;

/// Tools for accessing SonarQube metrics.
///
/// This module provides tools for retrieving code metrics from SonarQube.
pub mod metrics;

/// Tools for accessing SonarQube issues.
///
/// This module provides tools for retrieving and analyzing code issues from SonarQube.
pub mod issues;

/// Tools for managing SonarQube projects.
///
/// This module provides tools for listing and working with SonarQube projects.
pub mod projects;

/// Tools for working with SonarQube quality gates.
///
/// This module provides tools for assessing code quality based on SonarQube quality gates.
pub mod quality_gates;

/// Legacy tools module (deprecated).
///
/// This module contains legacy tools implementations that are maintained for backward compatibility.
/// New code should use the specific feature modules instead.
#[deprecated(
    since = "0.3.0",
    note = "Use specific feature modules instead of the combined tools module"
)]
pub mod tools;
