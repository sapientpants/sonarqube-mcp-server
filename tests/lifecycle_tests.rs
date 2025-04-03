mod helpers;

use serde_json::Value;
use sonarqube_mcp_server::mcp::core::lifecycle::*;
use sonarqube_mcp_server::mcp::core::types::*;

#[tokio::test]
async fn test_initialize() {
    // Create a minimal initialize request
    let request = InitializeRequest {
        protocol_version: "1.0.0".to_string(),
        capabilities: ClientCapabilities::default(),
        client_info: Implementation {
            name: "Test Client".to_string(),
            version: "1.0.0".to_string(),
        },
    };

    // Call the initialize function
    let result = initialize(request).await;
    assert!(result.is_ok());

    // Verify the result
    let init_result = result.unwrap();
    assert_eq!(init_result.protocol_version, "1.0.0");
    assert!(init_result.instructions.is_some());
    assert_eq!(init_result.server_info.name, "sonarqube-mcp-server");
}

#[tokio::test]
async fn test_initialized() {
    // Test the initialized notification handler
    let result = initialized().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_shutdown() {
    // Test the shutdown request handler
    let result = shutdown().await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), Value::Null);
}

#[tokio::test]
async fn test_exit() {
    // Test the exit notification handler
    let result = exit().await;
    assert!(result.is_ok());
}
