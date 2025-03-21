mod helpers;

use sonarqube_mcp_server::mcp::resources::*;
use sonarqube_mcp_server::mcp::types::*;
use url::Url;

#[tokio::test]
async fn test_resources_list() {
    // Call resources_list function
    let result = resources_list(None).await.unwrap();

    // Verify the response contains resources
    assert!(
        !result.resources.is_empty(),
        "Resources list should not be empty"
    );

    // Verify next_cursor is None
    assert!(result.next_cursor.is_none());

    // Verify the resources have required fields
    for resource in &result.resources {
        assert!(!resource.name.is_empty());
        assert!(resource.uri.to_string().len() > 0);
    }
}

#[tokio::test]
async fn test_resource_read() {
    // Create a request with a URI
    let request = ReadResourceRequest {
        uri: Url::parse("resource:logs").unwrap(),
        meta: None,
    };

    // Call resource_read function
    let result = resource_read(request).await.unwrap();

    // Verify the response content
    assert_eq!(result.content.uri.to_string(), "resource:logs");
    assert_eq!(result.content.mime_type, Some("text/plain".to_string()));
    assert!(result.content.text.is_some());
    assert!(result.content.blob.is_none());

    // Verify the text content
    let text = result.content.text.unwrap();
    assert!(!text.is_empty());
}
