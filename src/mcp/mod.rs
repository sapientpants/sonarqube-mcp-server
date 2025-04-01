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
//! - `utilities`: Provides helper functions for server operation

/// Module for managing and exposing prompts to MCP clients
pub mod prompts;
/// Module for handling resource-related operations and endpoints
pub mod resources;
/// Module for SonarQube integration and API interactions
pub mod sonarqube;
/// Module for registering and exposing tools to MCP clients
pub mod tools;
/// Module containing data structure definitions for the MCP protocol
pub mod types;
/// Module providing utility functions for server operation
pub mod utilities;

/// JSON-RPC protocol version used by the server
#[allow(dead_code)]
const JSONRPC_VERSION: &str = "2.0";

/// MCP protocol version implemented by the server
#[allow(dead_code)]
const PROTOCOL_VERSION: &str = "2024-11-05";

/// Name of the server implementation
#[allow(dead_code)]
const SERVER_NAME: &str = "mcp-rs-template";

/// Version of the server implementation
#[allow(dead_code)]
const SERVER_VERSION: &str = "0.1.0";
