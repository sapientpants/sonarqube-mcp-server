use crate::mcp::types::*;
use rpc_router::HandlerResult;

pub async fn prompts_list(
    _request: Option<ListPromptsRequest>,
) -> HandlerResult<ListPromptsResult> {
    let prompts: Vec<Prompt> =
        serde_json::from_str(include_str!("./templates/prompts.json")).unwrap();
    let response = ListPromptsResult {
        next_cursor: None,
        prompts,
    };
    Ok(response)
}

pub async fn prompts_get(request: GetPromptRequest) -> HandlerResult<PromptResult> {
    // Return a default empty prompt result as we don't have any defined prompts
    let response = PromptResult {
        description: format!("No prompt found for '{}'", request.name),
        messages: None,
    };
    Ok(response)
}
