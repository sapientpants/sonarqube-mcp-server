/// Metrics module for SonarQube integration
///
/// This module provides functionality for retrieving metrics from SonarQube.
use crate::mcp::errors::{McpError, McpResult};
use crate::mcp::sonarqube::client::SonarQubeClient;
#[allow(deprecated)]
use crate::mcp::sonarqube::config::get_client;
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::SonarQubeMetricsRequest;
use crate::mcp::types::{CallToolResult, CallToolResultContent};
use std::sync::Arc;

/// Legacy wrapper for sonarqube_get_metrics that uses global state
///
/// This is kept for backward compatibility.
#[allow(deprecated)]
pub async fn sonarqube_get_metrics_legacy(
    request: SonarQubeMetricsRequest,
) -> McpResult<CallToolResult> {
    let client = get_client().map_err(McpError::from)?;

    sonarqube_get_metrics_with_client(request, client).await
}

/// Retrieves metrics for a SonarQube project.
///
/// This handler function fetches metrics for a specific project from SonarQube.
/// The metrics can include code quality measures, test coverage, and other
/// analysis results.
///
/// # Arguments
///
/// * `request` - The request containing the project key and optional metric keys
/// * `context` - The server context containing dependencies
///
/// # Returns
///
/// Returns a result containing the requested metrics
pub async fn sonarqube_get_metrics(
    request: SonarQubeMetricsRequest,
    context: &ServerContext,
) -> McpResult<CallToolResult> {
    sonarqube_get_metrics_with_client(request, context.client()).await
}

/// Internal implementation for sonarqube_get_metrics that works with a provided client
async fn sonarqube_get_metrics_with_client(
    request: SonarQubeMetricsRequest,
    client: Arc<SonarQubeClient>,
) -> McpResult<CallToolResult> {
    let project_key = request.project_key;

    // Check if project exists
    let projects = client
        .list_projects(None, None, None)
        .await
        .map_err(|e| McpError::ExternalApiError(format!("SonarQube client error: {}", e)))?;

    if !projects.components.iter().any(|p| p.key == project_key) {
        return Err(
            McpError::NotFound(format!("Project not found: {}", project_key))
                .with_log("get_metrics"),
        );
    }

    // Convert metrics to string slices if provided
    let metrics_refs: Option<Vec<&str>> = request
        .metrics
        .as_ref()
        .map(|metrics| metrics.iter().map(|s| s.as_str()).collect());

    // Get metrics
    let metrics = client
        .get_metrics(&project_key, metrics_refs.as_deref().unwrap_or(&[]))
        .await
        .map_err(|e| McpError::ExternalApiError(format!("SonarQube API error: {}", e)))?;

    // Format the result
    let formatted_json = serde_json::to_string_pretty(&metrics).map_err(|e| {
        McpError::SerializationError(format!("Failed to serialize metrics: {}", e))
            .with_log("get_metrics")
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
