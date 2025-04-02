/// Quality gates module for SonarQube integration
///
/// This module provides functionality for assessing code quality based on SonarQube quality gates.
use crate::mcp::errors::{McpError, McpResult};
use crate::mcp::sonarqube::client::SonarQubeClient;
#[allow(deprecated)]
use crate::mcp::sonarqube::config::get_client;
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::SonarQubeQualityGateRequest;
use crate::mcp::types::{CallToolResult, CallToolResultContent};
use std::sync::Arc;

/// Legacy wrapper for sonarqube_get_quality_gate that uses global state
///
/// This is kept for backward compatibility.
#[allow(deprecated)]
pub async fn sonarqube_get_quality_gate_legacy(
    request: SonarQubeQualityGateRequest,
) -> McpResult<CallToolResult> {
    let client = get_client().map_err(McpError::from)?;

    sonarqube_get_quality_gate_with_client(request, client).await
}

/// Retrieves quality gate status for a SonarQube project.
///
/// This handler function fetches the quality gate status for a specific project
/// from SonarQube. The quality gate status indicates whether the project meets
/// the defined quality criteria.
///
/// # Arguments
///
/// * `request` - The request containing the project key
/// * `context` - The server context containing dependencies
///
/// # Returns
///
/// Returns a result containing the quality gate status
pub async fn sonarqube_get_quality_gate(
    request: SonarQubeQualityGateRequest,
    context: &ServerContext,
) -> McpResult<CallToolResult> {
    sonarqube_get_quality_gate_with_client(request, context.client()).await
}

/// Internal implementation for sonarqube_get_quality_gate that works with a provided client
async fn sonarqube_get_quality_gate_with_client(
    request: SonarQubeQualityGateRequest,
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
                .with_log("get_quality_gate"),
        );
    }

    // Get quality gate status
    let quality_gate = client
        .get_quality_gate(&project_key)
        .await
        .map_err(|e| McpError::ExternalApiError(format!("SonarQube API error: {}", e)))?;

    // Format the result
    let formatted_json = serde_json::to_string_pretty(&quality_gate).map_err(|e| {
        McpError::SerializationError(format!("Failed to serialize quality gate: {}", e))
            .with_log("get_quality_gate")
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
