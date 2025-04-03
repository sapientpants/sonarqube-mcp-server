mod helpers;

use sonarqube_mcp_server::mcp::core::types::{GetPromptRequest, ListPromptsRequest};
use sonarqube_mcp_server::mcp::prompts::*;

#[test]
fn test_prompts_functions() {
    let _ = prompts_list(Some(ListPromptsRequest { cursor: None }));
    let _ = prompts_get(GetPromptRequest {
        name: "test".to_string(),
        arguments: None,
    });
}

#[tokio::test]
async fn test_prompts_list() {
    // Call prompts_list function
    let result = prompts_list(None).await.unwrap();

    // Verify next_cursor is None
    assert!(result.next_cursor.is_none());

    // The prompts list may be empty in this implementation
    // If there are prompts, verify they have required fields
    for prompt in &result.prompts {
        assert!(!prompt.name.is_empty());
        // Check optional fields if they exist
        if let Some(description) = &prompt.description {
            assert!(!description.is_empty());
        }
    }
}

#[tokio::test]
async fn test_prompts_get() {
    // Create a request with a prompt name
    let request = GetPromptRequest {
        name: "test-prompt".to_string(),
        arguments: None,
    };

    // Call prompts_get function
    let result = prompts_get(request).await.unwrap();

    // Verify the response content
    assert!(!result.description.is_empty());
    assert!(result.description.contains("test-prompt"));

    // For now, messages is None since we don't have defined prompts
    assert!(result.messages.is_none());
}
