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
    let request = Some(PingRequest {});
    let result = ping(request).await.unwrap();

    // The ping function just returns () - no content
    assert_eq!(serde_json::to_string(&result).unwrap(), "null");
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

    // The current implementation returns an empty list, which is valid
    // Just verify the response structure is correct
    assert!(result.roots.is_empty());
}
