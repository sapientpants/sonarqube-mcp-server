mod helpers;

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
async fn test_roots_list() {
    let result = roots_list(None).await.unwrap();

    // The current implementation returns an empty list, which is valid
    // Just verify the response structure is correct
    assert!(result.roots.is_empty());
}

#[test]
fn test_graceful_shutdown() {
    // Just test that the function doesn't panic
    graceful_shutdown();
    // Since this function is a no-op in the current implementation,
    // there's not much to assert. If it changes later, this test
    // would need to be updated to verify the new behavior.
    assert!(true);
}
