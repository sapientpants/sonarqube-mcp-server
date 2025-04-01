mod helpers;

use sonarqube_mcp_server::mcp::types::*;
use sonarqube_mcp_server::mcp::utilities::*;

#[tokio::test]
async fn test_initialize() {
    let result = initialize().await.unwrap();
    let result_obj = result.as_object().unwrap();
    assert!(result_obj.contains_key("name"));
    assert!(result_obj.contains_key("version"));
    assert!(result_obj.contains_key("protocol"));
}

#[tokio::test]
async fn test_set_level() {
    let request = SetLevelRequest {
        level: "debug".to_string(),
    };
    let result = set_level(request).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_roots_list() {
    let result = roots_list(None).await.unwrap();

    // The current implementation returns an empty list, which is valid
    // Just verify the response structure is correct
    assert!(result.roots.is_empty());
}
