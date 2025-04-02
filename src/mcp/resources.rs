use crate::mcp::types::*;
use anyhow::Result;
use serde_json;

/// Lists all resources available in the MCP server.
///
/// This handler function returns information about all resources registered
/// with the MCP server. Resources can include log files, configuration files,
/// and other content that clients may need to access.
///
/// # Arguments
///
/// * `_request` - Optional request parameters for listing resources (currently unused)
///
/// # Returns
///
/// Returns a result containing the list of all available resources
pub async fn resources_list(_request: Option<ListResourcesRequest>) -> Result<ListResourcesResult> {
    let resources: Vec<Resource> =
        serde_json::from_str(include_str!("./templates/resources.json")).unwrap();
    let response = ListResourcesResult {
        resources,
        next_cursor: None,
    };
    Ok(response)
}
