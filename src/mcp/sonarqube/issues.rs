/// Issues module for SonarQube integration
///
/// This module provides functionality for retrieving and analyzing code issues from SonarQube.
use crate::mcp::errors::{McpError, McpResult};
use crate::mcp::sonarqube::client::SonarQubeClient;
#[allow(deprecated)]
use crate::mcp::sonarqube::config::get_client;
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::{IssuesQueryParams, SonarQubeIssuesRequest};
use crate::mcp::types::{CallToolResult, CallToolResultContent};
use std::sync::Arc;

/// Legacy wrapper for sonarqube_get_issues that uses global state
///
/// This is kept for backward compatibility.
#[allow(deprecated)]
pub async fn sonarqube_get_issues_legacy(
    request: SonarQubeIssuesRequest,
) -> McpResult<CallToolResult> {
    let client = get_client().map_err(McpError::from)?;

    sonarqube_get_issues_with_client(request, client).await
}

/// Retrieves issues for a SonarQube project.
///
/// This handler function fetches issues (e.g., bugs, vulnerabilities, code smells)
/// for a specific project from SonarQube. The issues can be filtered by various
/// criteria such as severity, type, and status.
///
/// # Arguments
///
/// * `request` - The request containing the project key and optional filters
/// * `context` - The server context containing dependencies
///
/// # Returns
///
/// Returns a result containing the requested issues
pub async fn sonarqube_get_issues(
    request: SonarQubeIssuesRequest,
    context: &ServerContext,
) -> McpResult<CallToolResult> {
    sonarqube_get_issues_with_client(request, context.client()).await
}

/// Internal implementation for sonarqube_get_issues that works with a provided client
async fn sonarqube_get_issues_with_client(
    request: SonarQubeIssuesRequest,
    client: Arc<SonarQubeClient>,
) -> McpResult<CallToolResult> {
    let project_key = request.project_key.clone();

    // Check if project exists
    let projects = client
        .list_projects(None, None, None)
        .await
        .map_err(|e| McpError::ExternalApiError(format!("SonarQube client error: {}", e)))?;

    if !projects.components.iter().any(|p| p.key == project_key) {
        return Err(
            McpError::NotFound(format!("Project not found: {}", project_key))
                .with_log("get_issues"),
        );
    }

    // Create query parameters
    let mut params = IssuesQueryParams::new(&project_key);

    // Set non-vector parameters
    params.assigned_to_me = request.assigned_to_me;
    params.created_after = request.created_after.as_deref();
    params.created_before = request.created_before.as_deref();
    params.created_in_last = request.created_in_last.as_deref();
    params.resolved = request.resolved;
    params.sort_field = request.sort_field.as_deref();
    params.asc = request.asc;
    params.page = request.page.map(|p| p as u32);
    params.page_size = request.page_size.map(|p| p as u32);

    // Convert vector parameters to string slices
    let severities_refs: Option<Vec<&str>> = request
        .severities
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());
    let types_refs: Option<Vec<&str>> = request
        .types
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());
    let statuses_refs: Option<Vec<&str>> = request
        .statuses
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());

    // Set vector parameters
    params.severities = severities_refs.as_deref();
    params.types = types_refs.as_deref();
    params.statuses = statuses_refs.as_deref();

    // Get issues
    let issues = client
        .get_issues(params)
        .await
        .map_err(|e| McpError::ExternalApiError(format!("SonarQube API error: {}", e)))?;

    // Format the result
    let formatted_json = serde_json::to_string_pretty(&issues).map_err(|e| {
        McpError::SerializationError(format!("Failed to serialize issues: {}", e))
            .with_log("get_issues")
    })?;

    // Create the response
    let result = CallToolResult {
        content: vec![CallToolResultContent::Text {
            text: formatted_json,
        }],
        is_error: false,
    };

    Ok(result)
}
