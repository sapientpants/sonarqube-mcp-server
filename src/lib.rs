//! # SonarQube MCP Server
//!
//! This crate provides a Model Context Protocol (MCP) server that integrates with
//! SonarQube to expose code quality metrics and analysis functionality to MCP clients.
//!
//! The server implements the MCP specification, providing a JSON-RPC based API that allows
//! clients to:
//!
//! - List and retrieve resources such as documentation and templates
//! - Access prompts for AI assistance
//! - Call tools that interact with SonarQube, including:
//!   - Fetching project metrics
//!   - Retrieving code issues
//!   - Getting quality gate status
//!   - Listing available projects
//!
//! This integration enables IDE plugins, CI/CD tools, and other clients to
//! incorporate SonarQube's code quality insights directly into their workflows.

/// Module containing MCP protocol implementation and related functionality
pub mod mcp;
/// Module providing utility functions and command-line argument handling for the server
pub mod server;
// Export only the necessary items from the server module
pub use server::{Args, display_info, setup_signal_handlers};
