use crate::mcp::errors::{McpError, McpResult};
use jsonrpsee_server::RpcModule;
use tracing::info;

use crate::mcp::types::{ListToolsRequest, ListToolsResult, Tool};
use serde_json;

/// Lists all available tools that the MCP server provides.
///
/// This handler function returns information about all tools registered with
/// the MCP server. The tool definitions are stored in a JSON file and include
/// details such as name, description, parameters, and result schema.
///
/// Note: This is a legacy implementation kept for backward compatibility.
/// The RMCP SDK now handles tool registration and listing directly.
///
/// # Arguments
///
/// * `_request` - Optional request parameters for listing tools (currently unused)
///
/// # Returns
///
/// Returns a result containing the list of all available tools
pub async fn tools_list(_request: Option<ListToolsRequest>) -> McpResult<ListToolsResult> {
    info!("Legacy tools_list called - tools are now handled by RMCP SDK");
    let tools: Vec<Tool> = serde_json::from_str(include_str!("./templates/tools.json"))
        .map_err(|e| McpError::SerializationError(format!("Failed to parse tools JSON: {}", e)))?;

    let response = ListToolsResult {
        tools,
        next_cursor: None,
    };

    Ok(response)
}

/// Register all tools with the router (legacy implementation).
///
/// This function is kept for backward compatibility during the transition to
/// the RMCP SDK, which handles tool registration directly through the #[tool]
/// attribute macro.
///
/// # Arguments
///
/// * `module` - The RPC module to register tools with
///
/// # Returns
///
/// Returns the RPC module with all tools registered
pub fn register_tools(module: &mut RpcModule<()>) -> McpResult<()> {
    info!("Legacy register_tools called - tools are now registered via RMCP SDK");

    module
        .register_async_method("tools/list", |_, _| async move {
            tools_list(None).await.map_err(|e| e.to_error_object())
        })
        .map_err(|e| McpError::InternalError(format!("Failed to register tools/list: {}", e)))?;

    Ok(())
}
