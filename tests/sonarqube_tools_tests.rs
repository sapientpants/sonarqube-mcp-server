mod helpers;

use sonarqube_mcp_server::mcp::sonarqube::tools::{
    register_sonarqube_tools, sonarqube_get_issues, sonarqube_get_metrics,
    sonarqube_get_quality_gate, sonarqube_list_projects,
};
use sonarqube_mcp_server::mcp::sonarqube::types::*;
use sonarqube_mcp_server::mcp::types::CallToolResultContent;
use std::env;

#[test]
fn test_init_sonarqube_client_error_conditions() {
    // Save original environment variables
    let original_url = env::var("SONARQUBE_URL").ok();
    let original_token = env::var("SONARQUBE_TOKEN").ok();

    // Test 1: Missing URL
    // ------------------
    // Unset environment variables
    env::remove_var("SONARQUBE_URL");
    env::remove_var("SONARQUBE_TOKEN");

    // Try to initialize client
    let result = sonarqube_mcp_server::mcp::sonarqube::tools::init_sonarqube_client();

    // Verify error when URL is missing
    assert!(result.is_err());
    match result {
        Err(SonarError::Config(msg)) => {
            assert_eq!(msg, "SONARQUBE_URL environment variable not set");
        }
        _ => panic!("Expected Config error for missing URL"),
    }

    // Test 2: Missing Token
    // -------------------
    // Set the URL but not the token
    env::set_var("SONARQUBE_URL", "https://sonarqube.example.com");

    // Try to initialize client again
    let result = sonarqube_mcp_server::mcp::sonarqube::tools::init_sonarqube_client();

    // Verify error when token is missing
    assert!(result.is_err());
    match result {
        Err(SonarError::Config(msg)) => {
            assert_eq!(msg, "SONARQUBE_TOKEN environment variable not set");
        }
        _ => panic!("Expected Config error for missing token"),
    }

    // Restore environment variables
    env::remove_var("SONARQUBE_URL");
    if let Some(url) = original_url {
        env::set_var("SONARQUBE_URL", url);
    }
    if let Some(token) = original_token {
        env::set_var("SONARQUBE_TOKEN", token);
    }
}

#[test]
fn test_register_sonarqube_tools() {
    // Create a router builder
    let builder = rpc_router::RouterBuilder::default();

    // Register SonarQube tools
    let _builder = register_sonarqube_tools(builder);

    // We can't easily test the router functionality without mocking,
    // so we just verify that the function doesn't panic
}

// Test handlers without a client - they should all return errors

#[tokio::test]
async fn test_sonarqube_get_metrics_no_client() {
    // We're testing without initializing the client

    // Call the tool handler
    let request = SonarQubeMetricsRequest {
        project_key: "test-project".to_string(),
        metrics: None,
    };
    let result = sonarqube_get_metrics(request).await;

    // Since there's no global client initialized, this should error
    assert!(result.is_err());
}

#[tokio::test]
async fn test_sonarqube_get_issues_no_client() {
    // We're testing without initializing the client

    // Call the tool handler
    let request = SonarQubeIssuesRequest {
        project_key: "test-project".to_string(),
        severities: None,
        types: None,
        statuses: None,
        impact_severities: None,
        impact_software_qualities: None,
        assigned_to_me: None,
        assignees: None,
        authors: None,
        code_variants: None,
        created_after: None,
        created_before: None,
        created_in_last: None,
        cwe: None,
        directories: None,
        facets: None,
        files: None,
        issue_statuses: None,
        languages: None,
        owasp_top10: None,
        owasp_top10_2021: None,
        resolutions: None,
        resolved: None,
        rules: None,
        sans_top25: None,
        sonarsource_security: None,
        tags: None,
        sort_field: None,
        asc: None,
        page: None,
        page_size: None,
    };
    let result = sonarqube_get_issues(request).await;

    // Since there's no global client initialized, this should error
    assert!(result.is_err());
}

#[tokio::test]
async fn test_sonarqube_get_quality_gate_no_client() {
    // We're testing without initializing the client

    // Call the tool handler
    let request = SonarQubeQualityGateRequest {
        project_key: "test-project".to_string(),
    };
    let result = sonarqube_get_quality_gate(request).await;

    // Since there's no global client initialized, this should error
    assert!(result.is_err());
}

#[tokio::test]
async fn test_sonarqube_list_projects_no_client() {
    // We're testing without initializing the client

    // Call the tool handler
    let request = SonarQubeListProjectsRequest {
        page: None,
        page_size: None,
        organization: None,
    };
    let result = sonarqube_list_projects(request).await;

    // Since there's no global client initialized, this should error
    assert!(result.is_err());
}

// Integration test - we'll create a test that ensures the CallToolResultContent is correctly formatted
#[test]
fn test_call_tool_result_content_formatting() {
    // Test text content
    let text_content = CallToolResultContent::Text {
        text: "Test result".to_string(),
    };

    // Verify JSON serialization
    let json = serde_json::to_string(&text_content).unwrap();
    assert!(json.contains(r#""type":"text""#));
    assert!(json.contains(r#""text":"Test result""#));

    // Test deserialization
    let deserialized: CallToolResultContent = serde_json::from_str(&json).unwrap();
    match deserialized {
        CallToolResultContent::Text { text } => assert_eq!(text, "Test result"),
        _ => panic!("Expected Text variant"),
    }
}
