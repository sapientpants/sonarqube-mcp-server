/// Projects module for SonarQube integration
///
/// This module provides functionality for listing and working with SonarQube projects.
use crate::mcp::core::errors::{McpError, McpResult};
use crate::mcp::core::types::{ListProjectsResult, Project};
use crate::mcp::sonarqube::client::SonarQubeClient;
#[allow(deprecated)]
use crate::mcp::sonarqube::config::get_client;
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::SonarQubeListProjectsRequest;
use std::sync::Arc;

/// Legacy wrapper for list_projects that uses global state
///
/// This is kept for backward compatibility.
#[allow(deprecated)]
pub async fn list_projects_legacy(
    request: Option<SonarQubeListProjectsRequest>,
) -> McpResult<ListProjectsResult> {
    let client = get_client().map_err(|e| McpError::from(e).with_log("list_projects_legacy"))?;

    list_projects_with_client(request, client).await
}

/// Lists projects from SonarQube.
///
/// This handler function retrieves a list of projects from SonarQube,
/// optionally filtered by various criteria.
///
/// # Arguments
///
/// * `request` - Optional request parameters for filtering projects
/// * `context` - The server context containing dependencies
///
/// # Returns
///
/// Returns a result containing the list of projects
pub async fn list_projects(
    request: Option<SonarQubeListProjectsRequest>,
    context: &ServerContext,
) -> McpResult<ListProjectsResult> {
    list_projects_with_client(request, context.client())
        .await
        .map_err(|e| e.with_log("list_projects"))
}

/// Internal implementation for list_projects that works with a provided client
async fn list_projects_with_client(
    request: Option<SonarQubeListProjectsRequest>,
    client: Arc<SonarQubeClient>,
) -> McpResult<ListProjectsResult> {
    // Extract parameters from request
    let (page, page_size, organization) = match request {
        Some(req) => {
            let org_str = req.organization.clone();
            (req.page, req.page_size, org_str)
        }
        None => (None, None, None),
    };

    // Call SonarQube client
    let org_ref = organization.as_deref();
    let projects_response = client
        .list_projects(page, page_size, org_ref)
        .await
        .map_err(|e| McpError::ExternalApiError(format!("SonarQube API error: {}", e)))?;

    // Transform to MCP response format
    let projects: Vec<Project> = projects_response
        .components
        .into_iter()
        .map(|component| Project {
            key: component.key,
            name: component.name,
        })
        .collect();

    Ok(ListProjectsResult { projects })
}
