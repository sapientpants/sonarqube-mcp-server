mod helpers;

use sonarqube_mcp_server::mcp::resources::*;
use sonarqube_mcp_server::mcp::types::*;

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
