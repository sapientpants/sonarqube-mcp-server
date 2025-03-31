use anyhow::Result;
use jsonrpsee_server::RpcModule;
use jsonrpsee_types::ErrorObject;

use crate::mcp::types::{ListToolsRequest, ListToolsResult, Tool};
use serde_json;

/// Lists all available tools that the MCP server provides.
///
/// This handler function returns information about all tools registered with
/// the MCP server. The tool definitions are stored in a JSON file and include
/// details such as name, description, parameters, and result schema.
///
/// # Arguments
///
/// * `_request` - Optional request parameters for listing tools (currently unused)
///
/// # Returns
///
/// Returns a result containing the list of all available tools
pub async fn tools_list(_request: Option<ListToolsRequest>) -> Result<ListToolsResult> {
    let tools: Vec<Tool> = serde_json::from_str(include_str!("./templates/tools.json")).unwrap();
    let response = ListToolsResult {
        tools,
        next_cursor: None,
    };
    Ok(response)
}

/// Register all tools with the router.
///
/// This function initializes all tools that the MCP server provides,
/// including tools for resource management, prompts, and SonarQube integration.
///
/// # Arguments
///
/// * `module` - The RPC module to register tools with
///
/// # Returns
///
/// Returns the RPC module with all tools registered
pub fn register_tools(module: &mut RpcModule<()>) -> Result<()> {
    module.register_async_method("tools/list", |_, _| async move {
        tools_list(None)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;
    Ok(())
}
