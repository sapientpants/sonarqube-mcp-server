use crate::mcp::errors::McpResult;
use crate::mcp::types::ListResourcesResult;
use tracing::info;

/// Lists all available resources that the MCP server provides.
///
/// This handler function returns information about all resources registered
/// with the MCP server, including prompts and other data resources.
///
/// Note: This is a legacy implementation kept for backward compatibility.
/// The RMCP SDK now handles resource registration and listing directly.
///
/// # Returns
///
/// Returns a result containing the list of all available resources
pub async fn resources_list() -> McpResult<ListResourcesResult> {
    info!("Legacy resources_list called - resources are now handled by RMCP SDK");

    // For now, we return an empty list as resources are handled by the SDK
    let response = ListResourcesResult {
        resources: vec![],
        next_cursor: None,
    };

    Ok(response)
}
