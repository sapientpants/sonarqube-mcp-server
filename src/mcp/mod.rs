/// MCP (Modern Communications Protocol) implementation for SonarQube integration.
///
/// This module provides the core functionality of the SonarQube MCP server, including:
///
/// - JSON-RPC protocol implementation for client-server communication
/// - Resource management for accessing documentation and static assets
/// - Tools for interacting with SonarQube services
/// - Prompts for AI assistance related to SonarQube
/// - Types and utilities for server operation
///
/// The MCP module is organized into several submodules:
/// - `prompts`: Handles AI prompts for SonarQube-related assistance
/// - `resources`: Manages static resources like documentation and templates
/// - `sonarqube`: Contains the SonarQube integration code (client, tools, types)
/// - `tools`: Registers and exposes tools to MCP clients
/// - `types`: Defines data structures used throughout the server
/// - `utilities`: Provides helper functions for server operation
pub mod prompts;
pub mod resources;
pub mod sonarqube;
pub mod tools;
pub mod types;
pub mod utilities;

const JSONRPC_VERSION: &str = "2.0";
const PROTOCOL_VERSION: &str = "2024-11-05";
const SERVER_NAME: &str = "mcp-rs-template";
const SERVER_VERSION: &str = "0.1.0";
