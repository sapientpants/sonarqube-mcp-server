use crate::mcp::types::*;
use anyhow::Result;
use serde_json;

/// Lists all prompts available in the MCP server.
///
/// This handler function returns information about all prompts registered
/// with the MCP server. Prompts are pre-defined templates or conversation
/// starters that can be used by AI assistants to provide consistent responses
/// for common tasks or queries.
///
/// # Arguments
///
/// * `_request` - Optional request parameters for listing prompts (currently unused)
///
/// # Returns
///
/// Returns a result containing the list of all available prompts
pub async fn prompts_list(_request: Option<ListPromptsRequest>) -> Result<ListPromptsResult> {
    let prompts: Vec<Prompt> =
        serde_json::from_str(include_str!("./templates/prompts.json")).unwrap();
    let response = ListPromptsResult {
        next_cursor: None,
        prompts,
    };
    Ok(response)
}

/// Retrieves a specific prompt by name.
///
/// This handler function looks up and returns a prompt by its unique name.
/// The prompt includes a description and optional message templates that
/// can be used by AI assistants.
///
/// # Arguments
///
/// * `request` - The request containing the name of the prompt to retrieve
///
/// # Returns
///
/// Returns a result containing the requested prompt or a default empty result
/// if the prompt is not found
pub async fn prompts_get(request: GetPromptRequest) -> Result<PromptResult> {
    // Return a default empty prompt result as we don't have any defined prompts
    let response = PromptResult {
        description: format!("No prompt found for '{}'", request.name),
        messages: None,
    };
    Ok(response)
}
