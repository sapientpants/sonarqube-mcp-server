use crate::mcp::types::*;
use rpc_router::HandlerResult;

pub async fn resources_list(
    _request: Option<ListResourcesRequest>,
) -> HandlerResult<ListResourcesResult> {
    let resources: Vec<Resource> =
        serde_json::from_str(include_str!("./templates/resources.json")).unwrap();
    let response = ListResourcesResult {
        resources,
        next_cursor: None,
    };
    Ok(response)
}

pub async fn resource_read(request: ReadResourceRequest) -> HandlerResult<ReadResourceResult> {
    let response = ReadResourceResult {
        content: ResourceContent {
            uri: request.uri.clone(),
            mime_type: Some("text/plain".to_string()),
            text: Some("2024-11-28T08:19:18.974368Z,INFO,main,this is message".to_string()),
            blob: None,
        },
    };
    Ok(response)
}
