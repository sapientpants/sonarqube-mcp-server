use crate::mcp::core::errors::McpResult;
use crate::mcp::core::types::*;
use tracing::info;

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
pub async fn prompts_list(_request: Option<ListPromptsRequest>) -> McpResult<ListPromptsResult> {
    info!("Legacy prompts_list called - prompts are now handled by RMCP SDK");

    // NOTE: Prompts functionality is not currently implemented
    // Return an empty vector instead of loading from JSON file
    let prompts: Vec<Prompt> = Vec::new();
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
pub async fn prompts_get(request: GetPromptRequest) -> McpResult<PromptResult> {
    info!(
        "Legacy prompts_get called for '{}' - prompts are now handled by RMCP SDK",
        request.name
    );

    // NOTE: Prompts functionality is not currently implemented
    // Return a default empty prompt result with an explanatory message
    let response = PromptResult {
        description: format!(
            "No prompt found for '{}'. Prompts functionality is not currently implemented.",
            request.name
        ),
        messages: None,
    };
    Ok(response)
}
