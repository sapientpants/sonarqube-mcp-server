//! # SonarQube MCP Server
//!
//! This crate provides a Modern Communications Protocol (MCP) server that integrates with
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

pub mod mcp;
pub mod server;
pub use server::{Args, build_rpc_router, display_info, setup_signal_handlers};
