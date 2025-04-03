//! MCP (Model Context Protocol) implementation for SonarQube integration.
//!
//! This module provides the core functionality of the SonarQube MCP server, including:
//!
//! - JSON-RPC protocol implementation for client-server communication
//! - Resource management for accessing documentation and static assets
//! - Tools for interacting with SonarQube services
//! - Prompts for AI assistance related to SonarQube
//! - Types and utilities for server operation
//!
//! The MCP module is organized into several submodules:
//! - `prompts`: Handles AI prompts for SonarQube-related assistance
//! - `resources`: Manages static resources like documentation and templates
//! - `sonarqube`: Contains the SonarQube integration code (client, tools, types)
//! - `tools`: Registers and exposes tools to MCP clients
//! - `types`: Defines data structures used throughout the server
//! - `lifecycle`: Handles MCP protocol lifecycle such as initialization

/// Configuration management module
pub mod config;
/// Module for managing and exposing prompts to MCP clients
pub mod prompts;
/// Module for handling resource-related operations and endpoints
pub mod resources;
/// Module for SonarQube integration and API interactions
pub mod sonarqube;
/// Module for registering and exposing tools to MCP clients
pub mod tools;

/// Core MCP functionality (protocol types, errors, lifecycle)
pub mod core;

/// JSON-RPC protocol version used by the server
const JSONRPC_VERSION: &str = "2.0";

/// MCP protocol version implemented by the server
const PROTOCOL_VERSION: &str = "1.0.0";

/// Name of the server implementation
const SERVER_NAME: &str = "sonarqube-mcp-server";

/// Version of the server implementation
const SERVER_VERSION: &str = env!("CARGO_PKG_VERSION");

pub use core::errors::{ApiError, McpError, McpResult, error_codes};
pub use core::lifecycle::{exit, initialize, initialized, shutdown};
/// Re-export key types for easier imports
pub use resources::resources_list;
pub use tools::{register_tools, tools_list};

/// Default API endpoint for the MCP server
pub const DEFAULT_ENDPOINT: &str = "127.0.0.1:3000";

#[cfg(test)]
mod tests {
    #[test]
    fn test_version_constants() {
        assert!(!super::SERVER_NAME.is_empty());
        assert!(!super::SERVER_VERSION.is_empty());
        assert!(!super::PROTOCOL_VERSION.is_empty());
    }

    #[test]
    fn test_jsonrpc_version() {
        assert_eq!(super::JSONRPC_VERSION, "2.0");
    }
}
