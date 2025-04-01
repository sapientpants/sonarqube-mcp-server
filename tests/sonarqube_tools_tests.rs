mod helpers;

use jsonrpsee_server::RpcModule;
use sonarqube_mcp_server::mcp::sonarqube::tools::{
    list_projects as sonarqube_list_projects, register_sonarqube_tools, sonarqube_get_issues,
    sonarqube_get_metrics, sonarqube_get_quality_gate,
};
use sonarqube_mcp_server::mcp::sonarqube::types::*;
use sonarqube_mcp_server::mcp::types::CallToolResultContent;
use std::env;

// Static constants for environment variable names
static SONARQUBE_URL_ENV: &str = "SONARQUBE_URL";
static SONARQUBE_TOKEN_ENV: &str = "SONARQUBE_TOKEN";

#[test]
fn test_init_sonarqube_client_error_conditions() {
    // Save original environment variables
    let original_url = env::var(SONARQUBE_URL_ENV).ok();
    let original_token = env::var(SONARQUBE_TOKEN_ENV).ok();

    // Test 1: Missing URL
    // ------------------
    // Unset environment variables
    unsafe {
        env::remove_var(SONARQUBE_URL_ENV);
    }
    unsafe {
        env::remove_var(SONARQUBE_TOKEN_ENV);
    }

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
    unsafe {
        env::set_var(SONARQUBE_URL_ENV, "https://sonarqube.example.com");
    }

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

    // Test 3: Client Set Error
    // ----------------------
    // Set both URL and token
    unsafe {
        env::set_var(SONARQUBE_TOKEN_ENV, "test-token");
    }

    // Try to initialize client twice (should fail on second attempt)
    let _ = sonarqube_mcp_server::mcp::sonarqube::tools::init_sonarqube_client();
    let result = sonarqube_mcp_server::mcp::sonarqube::tools::init_sonarqube_client();

    // Verify error when trying to set client twice
    assert!(result.is_err());
    match result {
        Err(SonarError::Config(msg)) => {
            assert_eq!(msg, "Failed to set SonarQube client");
        }
        _ => panic!("Expected Config error for client set failure"),
    }

    // Restore environment variables
    unsafe {
        env::remove_var(SONARQUBE_URL_ENV);
    }
    if let Some(url) = original_url {
        unsafe {
            env::set_var(SONARQUBE_URL_ENV, url);
        }
    }
    if let Some(token) = original_token {
        unsafe {
            env::set_var(SONARQUBE_TOKEN_ENV, token);
        }
    }
}

#[test]
fn test_register_sonarqube_tools() {
    // Create a router module
    let mut router = RpcModule::new(());

    // Register SonarQube tools
    register_sonarqube_tools(&mut router).unwrap();

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
    };
    let result = sonarqube_list_projects(Some(request)).await;

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

// Test that errors are correctly returned for non-existent projects
#[tokio::test]
async fn test_project_not_found_errors() {
    // Save current environment variables
    let original_url = std::env::var(SONARQUBE_URL_ENV).ok();
    let original_token = std::env::var(SONARQUBE_TOKEN_ENV).ok();

    // Set test environment variables with invalid values
    // Using a real base URL ensures that we'll actually try to connect
    // but the 404 error will be returned via the handler
    unsafe {
        std::env::set_var(SONARQUBE_URL_ENV, "https://example.com");
    }
    unsafe {
        std::env::set_var(SONARQUBE_TOKEN_ENV, "invalid-token");
    }

    // Initialize the client
    let _ = sonarqube_mcp_server::mcp::sonarqube::tools::init_sonarqube_client();

    // Define non-existent project key
    let unknown_project = "non-existent-project";

    // Test the metrics tool with a non-existent project
    let metrics_request = SonarQubeMetricsRequest {
        project_key: unknown_project.to_string(),
        metrics: None,
    };
    let metrics_result = sonarqube_get_metrics(metrics_request).await;

    // We should get an error (exact content will depend on how example.com responds)
    assert!(
        metrics_result.is_err(),
        "Expected an error for non-existent project, but got success"
    );

    // Test the issues tool with a non-existent project
    let issues_request = SonarQubeIssuesRequest {
        project_key: unknown_project.to_string(),
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
    let issues_result = sonarqube_get_issues(issues_request).await;

    // We should get an error
    assert!(
        issues_result.is_err(),
        "Expected an error for non-existent project, but got success"
    );

    // Test the quality gate tool with a non-existent project
    let quality_gate_request = SonarQubeQualityGateRequest {
        project_key: unknown_project.to_string(),
    };
    let quality_gate_result = sonarqube_get_quality_gate(quality_gate_request).await;

    // We should get an error
    assert!(
        quality_gate_result.is_err(),
        "Expected an error for non-existent project, but got success"
    );

    // Restore original environment variables
    match original_url {
        Some(url) => unsafe { std::env::set_var(SONARQUBE_URL_ENV, url) },
        None => unsafe { std::env::remove_var(SONARQUBE_URL_ENV) },
    }

    match original_token {
        Some(token) => unsafe { std::env::set_var(SONARQUBE_TOKEN_ENV, token) },
        None => unsafe { std::env::remove_var(SONARQUBE_TOKEN_ENV) },
    }
}
