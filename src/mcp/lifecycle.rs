//! MCP Protocol Lifecycle Management
//!
//! This module provides functions and handlers for managing the MCP protocol lifecycle,
//! including initialization, shutdown, and related operations.

// Note: Most of the functionality in this module has been migrated to use the RMCP SDK
// through the ServerHandler trait implementation in the main module. This module
// is kept for reference and backward compatibility during the transition.

use jsonrpsee_types::error::ErrorObject;
use serde_json::Value;
use tracing::info;

use crate::mcp::types::{
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
pub async fn initialize(
    params: InitializeRequest,
) -> Result<InitializeResult, ErrorObject<'static>> {
    // Log client information
    info!(
        "Initializing client: {} v{} (legacy handler)",
        params.client_info.name, params.client_info.version
    );
    info!(
        "Client requested protocol version: {}",
        params.protocol_version
    );

    // Create server capabilities
    let capabilities = ServerCapabilities {
        text: None,
        experimental: None,
        resources: Some(ResourcesCapabilities {
            get: Some(true),
            list: Some(true),
        }),
        tools: Some(ToolsCapabilities {
            call: Some(true),
            list: Some(true),
        }),
        sampling: None,
        prompts: Some(Value::Bool(true)),
        roots: None,
    };

    // Create server info
    let server_info = Implementation {
        name: SERVER_NAME.to_string(),
        version: SERVER_VERSION.to_string(),
    };

    // Return the initialization result
    let result = InitializeResult {
        protocol_version: PROTOCOL_VERSION.to_string(),
        capabilities,
        server_info,
        instructions: Some(
            "SonarQube MCP Server. Use the available tools to analyze SonarQube projects."
                .to_string(),
        ),
    };

    Ok(result)
}

/// Handles the initialized notification from an MCP client (legacy implementation)
///
/// Note: This is kept for backward compatibility. The main implementation now uses
/// the ServerHandler trait from the RMCP SDK.
///
/// # Returns
///
/// A result indicating success or an error
pub async fn initialized() -> Result<(), ErrorObject<'static>> {
    info!("Client initialized (legacy handler)");
    Ok(())
}

/// Handles the shutdown request from an MCP client (legacy implementation)
///
/// Note: This is kept for backward compatibility. The main implementation now uses
/// the ServerHandler trait from the RMCP SDK.
///
/// # Returns
///
/// A result containing a null value on success or an error
pub async fn shutdown() -> Result<Value, ErrorObject<'static>> {
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
pub async fn exit() -> Result<(), ErrorObject<'static>> {
    info!("Exit requested (legacy handler)");
    Ok(())
}
