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

/// Reads and returns the content of a specific resource.
///
/// This handler function retrieves the content of a resource identified by its URI.
/// The content is returned with appropriate MIME type information to help clients
/// process it correctly.
///
/// # Arguments
///
/// * `request` - The request containing the URI of the resource to read
///
/// # Returns
///
/// Returns a result containing the content of the requested resource
pub async fn resource_read(_request: ReadResourceRequest) -> Result<ReadResourceResult> {
    let response = ReadResourceResult {
        content: ResourceContent::Text {
            text: "2024-11-28T08:19:18.974368Z,INFO,main,this is message".to_string(),
        },
    };
    Ok(response)
}
