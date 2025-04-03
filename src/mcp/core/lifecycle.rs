//! MCP Protocol Lifecycle Management
//!
//! This module provides functions and handlers for managing the MCP protocol lifecycle,
//! including initialization, shutdown, and related operations.

// Note: Most of the functionality in this module has been migrated to use the RMCP SDK
// through the ServerHandler trait implementation in the main module. This module
// is kept for reference and backward compatibility during the transition.

use crate::mcp::core::errors::McpResult;
use serde_json::Value;
use tracing::info;

use crate::mcp::core::types::{
    Implementation, InitializeRequest, InitializeResult, ResourcesCapabilities, ServerCapabilities,
    ToolsCapabilities,
};
use crate::mcp::{PROTOCOL_VERSION, SERVER_NAME, SERVER_VERSION};

/// Handles the initialize request from an MCP client (legacy implementation)
///
/// This function processes the initialization request, validates the client's capabilities,
/// and returns the server's capabilities and information.
///
/// Note: This is kept for backward compatibility. The main implementation now uses
/// the ServerHandler trait from the RMCP SDK.
///
/// # Arguments
///
/// * `params` - The initialize request parameters from the client
///
/// # Returns
///
/// A result containing either the initialization response or an error
pub async fn initialize(params: InitializeRequest) -> McpResult<InitializeResult> {
    info!("Initializing MCP server (legacy handler)");
    info!(
        "Client info: name={}, version={}",
        params.client_info.name, params.client_info.version
    );

    // Server capabilities
    let capabilities = ServerCapabilities {
        tools: Some(ToolsCapabilities {
            call: Some(true),
            list: Some(true),
        }),
        resources: Some(ResourcesCapabilities {
            get: Some(true),
            list: Some(true),
        }),
        experimental: None,
        prompts: None,
        roots: None,
        sampling: None,
        text: None,
    };

    // Build response
    let result = InitializeResult {
        server_info: Implementation {
            name: SERVER_NAME.to_string(),
            version: SERVER_VERSION.to_string(),
        },
        protocol_version: PROTOCOL_VERSION.to_string(),
        capabilities,
        instructions: Some(
            "SonarQube MCP Server provides tools for analyzing code quality and security."
                .to_string(),
        ),
    };

    Ok(result)
}

/// Handles the initialized notification from an MCP client (legacy implementation)
///
/// This function processes the notification that the client has completed
/// its initialization and is ready to receive requests.
///
/// Note: This is kept for backward compatibility. The main implementation now uses
/// the ServerHandler trait from the RMCP SDK.
///
/// # Returns
///
/// A result indicating success or an error
pub async fn initialized() -> McpResult<()> {
    info!("Client initialized (legacy handler)");
    Ok(())
}

/// Handles the shutdown request from an MCP client (legacy implementation)
///
/// This function initiates a clean shutdown of the server, allowing it to
/// complete any pending operations before exiting.
///
/// Note: This is kept for backward compatibility. The main implementation now uses
/// the ServerHandler trait from the RMCP SDK.
///
/// # Returns
///
/// A result containing a null value on success or an error
pub async fn shutdown() -> McpResult<Value> {
    info!("Shutdown requested (legacy handler)");
    Ok(Value::Null)
}

/// Handles the exit notification from an MCP client (legacy implementation)
///
/// Note: This is kept for backward compatibility. The main implementation now uses
/// the ServerHandler trait from the RMCP SDK.
///
/// # Returns
///
/// A result indicating success or an error
pub async fn exit() -> McpResult<()> {
    info!("Exit requested (legacy handler)");
    Ok(())
}
