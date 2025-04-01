//! MCP Protocol Lifecycle Management
//!
//! This module provides functions and handlers for managing the MCP protocol lifecycle,
//! including initialization, shutdown, and related operations.

use anyhow::Result;
use jsonrpsee_types::error::ErrorObject;
use serde_json::Value;

use crate::mcp::types::{
    Implementation, InitializeRequest, InitializeResult, ResourcesCapabilities, ServerCapabilities,
    ToolsCapabilities,
};
use crate::mcp::{PROTOCOL_VERSION, SERVER_NAME, SERVER_VERSION};

/// Handles the initialize request from an MCP client
///
/// This function processes the initialization request, validates the client's capabilities,
/// and returns the server's capabilities and information.
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
    tracing::info!(
        "Initializing client: {} v{}",
        params.client_info.name,
        params.client_info.version
    );
    tracing::info!(
        "Client requested protocol version: {}",
        params.protocol_version
    );

    // Mark that we've just initialized to ignore the first SIGTERM
    if let Some(initialized_flag) = crate::server::INITIALIZED_RECENTLY.get() {
        initialized_flag.store(true, std::sync::atomic::Ordering::SeqCst);
        tracing::info!("Set initialization flag to true");
    }

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

/// Handles the initialized notification from an MCP client
///
/// This function is called when a client sends an initialized notification,
/// indicating that it has completed its initialization phase and is ready to
/// communicate with the server.
///
/// # Returns
///
/// A result indicating success or an error
pub async fn initialized() -> Result<(), ErrorObject<'static>> {
    tracing::info!("Client initialized");
    Ok(())
}

/// Handles the shutdown request from an MCP client
///
/// This function is called when a client requests the server to shut down.
///
/// # Returns
///
/// A result containing a null value on success or an error
pub async fn shutdown() -> Result<Value, ErrorObject<'static>> {
    tracing::info!("Shutdown requested");
    Ok(Value::Null)
}

/// Handles the exit notification from an MCP client
///
/// This function is called when a client notifies the server that it should exit.
///
/// # Returns
///
/// A result indicating success or an error
pub async fn exit() -> Result<(), ErrorObject<'static>> {
    tracing::info!("Exit requested");
    // In a real implementation, we might want to call std::process::exit here,
    // but for our MCP server we'll let the main loop handle the shutdown
    Ok(())
}
