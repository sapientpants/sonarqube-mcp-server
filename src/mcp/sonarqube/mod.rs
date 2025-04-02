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

/// MCP tools exposing SonarQube functionality to clients.
///
/// This module defines the tools that are registered with the MCP server
/// to allow clients to interact with SonarQube services.
pub mod tools;

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

/// Testing utilities for SonarQube integration.
///
/// This module provides helper functions and utilities used specifically
/// in testing the SonarQube integration components.
pub mod test_utils;
