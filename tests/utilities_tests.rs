mod helpers;

use sonarqube_mcp_server::mcp::types::*;
use sonarqube_mcp_server::mcp::utilities::*;

#[tokio::test]
async fn test_initialize() {
    // Create a proper initialize request
    let request = InitializeRequest {
        protocol_version: "1.0".to_string(),
        capabilities: ClientCapabilities::default(),
        client_info: Implementation {
            name: "test-client".to_string(),
            version: "1.0.0".to_string(),
        },
    };

    // Call initialize function
    let result = initialize(request).await.unwrap();

    // Verify response fields contain expected values
    // Note: The actual name may vary depending on the application configuration
    assert!(!result.server_info.name.is_empty());
    assert!(!result.protocol_version.is_empty());

    // Check capabilities
    assert!(result.capabilities.prompts.is_some());
    assert!(result.capabilities.tools.is_some());
}

#[tokio::test]
async fn test_ping() {
    let request = PingRequest {};
    let result = ping(request).await.unwrap();

    // Empty result should be returned
    assert_eq!(
        serde_json::to_string(&result).unwrap(),
        serde_json::to_string(&EmptyResult {}).unwrap()
    );
}

#[tokio::test]
async fn test_logging_set_level() {
    let request = SetLevelRequest {
        level: "debug".to_string(),
    };

    let result = logging_set_level(request).await.unwrap();

    // LoggingResponse should be returned
    assert_eq!(
        serde_json::to_string(&result).unwrap(),
        serde_json::to_string(&LoggingResponse {}).unwrap()
    );
}

#[tokio::test]
async fn test_roots_list() {
    let result = roots_list(None).await.unwrap();

    // Verify the response contains at least one root
    assert!(!result.roots.is_empty());

    // Verify the first root has a name and URL
    let first_root = &result.roots[0];
    assert!(!first_root.name.is_empty());
    assert!(!first_root.url.is_empty());
}
