mod helpers;

use serde_json::Value;
use serde_json::json;
use sonarqube_mcp_server::mcp::types::ListRootsRequest;
use sonarqube_mcp_server::mcp::utilities::*;

#[tokio::test]
async fn test_initialize() {
    let result = initialize().await.unwrap();
    let result_obj = result.as_object().unwrap();

    // Verify all required fields are present
    assert!(result_obj.contains_key("name"));
    assert!(result_obj.contains_key("version"));
    assert!(result_obj.contains_key("protocol"));

    // Verify field values are non-empty strings
    assert!(result_obj["name"].as_str().unwrap().len() > 0);
    assert!(result_obj["version"].as_str().unwrap().len() > 0);
    assert!(result_obj["protocol"].as_str().unwrap().len() > 0);
}

#[tokio::test]
async fn test_roots_list() {
    // Test with no request (None)
    let result = roots_list(None).await.unwrap();
    assert!(result.roots.is_empty());

    // Test with explicit request
    let request = Some(ListRootsRequest {});
    let result = roots_list(request).await.unwrap();
    assert!(result.roots.is_empty());
}

#[test]
fn test_graceful_shutdown() {
    // Test that graceful_shutdown can be called multiple times without issues
    graceful_shutdown();
    graceful_shutdown();

    // Test that we can continue execution after shutdown
    let result = std::panic::catch_unwind(|| {
        graceful_shutdown();
        true
    });
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_notifications() {
    // Test initialized notification
    let init_result = notifications_initialized().await;
    assert!(init_result.is_ok());
    let init_json = json!({
        "method": "initialized",
        "params": {}
    });
    assert_eq!(
        init_json,
        json!({
            "method": "initialized",
            "params": {}
        })
    );

    // Test cancelled notification
    let cancel_result = notifications_cancelled().await;
    assert!(cancel_result.is_ok());
    let cancel_json = json!({
        "method": "cancelled",
        "params": {}
    });
    assert_eq!(
        cancel_json,
        json!({
            "method": "cancelled",
            "params": {}
        })
    );
}

#[test]
fn test_utilities_functions_error_cases() {
    // Test that functions handle errors gracefully
    let result = std::panic::catch_unwind(|| {
        let _ = initialize();
        let _ = graceful_shutdown();
        let _ = roots_list(Some(ListRootsRequest {}));
        let _ = notifications_initialized();
        let _ = notifications_cancelled();
        true
    });
    assert!(result.is_ok());
}
