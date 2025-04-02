mod helpers;

use sonarqube_mcp_server::mcp::resources::*;
use sonarqube_mcp_server::mcp::types::*;

#[tokio::test]
async fn test_resources_list() {
    // Call resources_list function
    let result = resources_list().await.unwrap();

    // Verify the response contains an empty resources list
    assert!(
        result.resources.is_empty(),
        "Resources list should be empty in the legacy implementation"
    );

    // Verify next_cursor is None
    assert!(result.next_cursor.is_none());
}
