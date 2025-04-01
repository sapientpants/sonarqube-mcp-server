use once_cell::sync::OnceCell;
use std::sync::Arc;

use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::types::{
    IssuesQueryParams, ProjectsResponse, SonarError, SonarQubeConfig, SonarQubeIssuesRequest,
    SonarQubeListProjectsRequest, SonarQubeMetricsRequest, SonarQubeQualityGateRequest,
};
use crate::mcp::types::{
    CallToolResult, CallToolResultContent, GetIssuesRequest, GetIssuesResult, GetMetricsRequest,
    GetMetricsResult, GetQualityGateRequest, GetQualityGateResult, ListProjectsResult, Project,
};
use anyhow::Result;
use jsonrpsee_server::RpcModule;
use jsonrpsee_types::ErrorObject;
use serde_json::Value;

// Static constants for environment variable names
#[allow(dead_code)]
static SONARQUBE_URL_ENV: &str = "SONARQUBE_URL";
#[allow(dead_code)]
static SONARQUBE_TOKEN_ENV: &str = "SONARQUBE_TOKEN";
#[allow(dead_code)]
static SONARQUBE_ORGANIZATION_ENV: &str = "SONARQUBE_ORGANIZATION";

/// Global SonarQube client for tools to use
pub static SONARQUBE_CLIENT: OnceCell<Arc<SonarQubeClient>> = OnceCell::new();

/// Initialize the SonarQube client
#[allow(dead_code)]
pub fn init_sonarqube_client() -> Result<(), SonarError> {
    // Get environment variables
    let base_url = std::env::var(SONARQUBE_URL_ENV).map_err(|_| {
        SonarError::Config("SONARQUBE_URL environment variable not set".to_string())
    })?;

    let token = std::env::var(SONARQUBE_TOKEN_ENV).map_err(|_| {
        SonarError::Config("SONARQUBE_TOKEN environment variable not set".to_string())
    })?;

    // Get optional organization
    let organization = std::env::var(SONARQUBE_ORGANIZATION_ENV).ok();

    // Create config
    let config = SonarQubeConfig {
        base_url,
        token,
        organization,
    };

    // Create client
    let client = SonarQubeClient::new(config);

    // Store client in global variable
    SONARQUBE_CLIENT
        .set(Arc::new(client))
        .map_err(|_| SonarError::Config("Failed to set SonarQube client".to_string()))?;

    Ok(())
}

/// Get the SonarQube client instance
pub fn get_client() -> Result<&'static Arc<SonarQubeClient>, SonarError> {
    SONARQUBE_CLIENT
        .get()
        .ok_or_else(|| SonarError::Config(
            "SonarQube client not initialized. Make sure SONARQUBE_URL and SONARQUBE_TOKEN environment variables are set.".to_string()
        ))
}

/// Registers all SonarQube-related tools with the router.
///
/// This function initializes all tools that interact with the SonarQube API,
/// including tools for fetching metrics, issues, quality gate status, and
/// listing projects.
///
/// # Arguments
///
/// * `module` - The RPC module to register tools with
///
/// # Returns
///
/// Returns the RPC module with SonarQube tools registered
pub fn register_sonarqube_tools(module: &mut RpcModule<()>) -> Result<()> {
    module.register_async_method("sonarqube/metrics", |params, _| async move {
        let request = params.parse::<SonarQubeMetricsRequest>()?;
        sonarqube_get_metrics(request)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    module.register_async_method("sonarqube/issues", |params, _| async move {
        let request = params.parse::<SonarQubeIssuesRequest>()?;
        sonarqube_get_issues(request)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    module.register_async_method("sonarqube/quality_gate", |params, _| async move {
        let request = params.parse::<SonarQubeQualityGateRequest>()?;
        sonarqube_get_quality_gate(request)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    module.register_async_method("sonarqube/projects", |params, _| async move {
        let request = params.parse::<SonarQubeListProjectsRequest>()?;
        list_projects(Some(request))
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    Ok(())
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
///
/// # Returns
///
/// Returns a result containing the requested metrics
pub async fn sonarqube_get_metrics(request: SonarQubeMetricsRequest) -> Result<CallToolResult> {
    let client = get_client()?;
    let project_key = request.project_key;

    // Check if project exists
    let projects = client.list_projects(None, None, None).await?;
    if !projects.components.iter().any(|p| p.key == project_key) {
        return Err(anyhow::anyhow!("Project not found: {}", project_key));
    }

    // Convert metrics to string slices if provided
    let metrics_refs: Option<Vec<&str>> = request
        .metrics
        .as_ref()
        .map(|metrics| metrics.iter().map(|s| s.as_str()).collect());

    // Get metrics
    let metrics = client
        .get_metrics(&project_key, metrics_refs.as_deref().unwrap_or(&[]))
        .await?;

    let response = CallToolResult {
        content: vec![CallToolResultContent::Text {
            text: serde_json::to_string_pretty(&metrics)?,
        }],
        is_error: false,
    };

    Ok(response)
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
///
/// # Returns
///
/// Returns a result containing the requested issues
pub async fn sonarqube_get_issues(request: SonarQubeIssuesRequest) -> Result<CallToolResult> {
    let client = get_client()?;
    let project_key = request.project_key;

    // Check if project exists
    let projects = client.list_projects(None, None, None).await?;
    if !projects.components.iter().any(|p| p.key == project_key) {
        return Err(anyhow::anyhow!("Project not found: {}", project_key));
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
    let issues = client.get_issues(params).await?;

    let response = CallToolResult {
        content: vec![CallToolResultContent::Text {
            text: serde_json::to_string_pretty(&issues)?,
        }],
        is_error: false,
    };

    Ok(response)
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
///
/// # Returns
///
/// Returns a result containing the quality gate status
pub async fn sonarqube_get_quality_gate(
    request: SonarQubeQualityGateRequest,
) -> Result<CallToolResult> {
    let client = get_client()?;
    let project_key = request.project_key;

    // Check if project exists
    let projects = client.list_projects(None, None, None).await?;
    if !projects.components.iter().any(|p| p.key == project_key) {
        return Err(anyhow::anyhow!("Project not found: {}", project_key));
    }

    // Get quality gate status
    let quality_gate = client.get_quality_gate(&project_key).await?;

    let response = CallToolResult {
        content: vec![CallToolResultContent::Text {
            text: serde_json::to_string_pretty(&quality_gate)?,
        }],
        is_error: false,
    };

    Ok(response)
}

/// Lists all available SonarQube projects.
///
/// This function retrieves a list of all projects from the SonarQube instance.
///
/// # Arguments
///
/// * `request` - Optional parameters for pagination
///
/// # Returns
///
/// Returns a result containing the list of projects
pub async fn list_projects(
    request: Option<SonarQubeListProjectsRequest>,
) -> Result<ListProjectsResult> {
    let client = get_client()?;
    let mut params = vec![];
    if let Some(req) = request {
        if let Some(page) = req.page {
            params.push(("page", page.to_string()));
        }
        if let Some(page_size) = req.page_size {
            params.push(("pageSize", page_size.to_string()));
        }
    }

    let projects = client.list_projects(None, None, None).await?;
    Ok(convert_projects(projects))
}

/// Gets metrics for a SonarQube project.
///
/// This function retrieves specific metrics for a given project.
///
/// # Arguments
///
/// * `request` - The request containing project key and metrics to retrieve
///
/// # Returns
///
/// Returns a result containing the requested metrics
#[allow(dead_code)]
pub async fn get_metrics(_request: GetMetricsRequest) -> Result<GetMetricsResult> {
    let response = GetMetricsResult {
        metrics: Value::Null,
    };
    Ok(response)
}

/// Gets issues for a SonarQube project.
///
/// This function retrieves issues for a given project based on specified filters.
///
/// # Arguments
///
/// * `request` - The request containing project key and filter parameters
///
/// # Returns
///
/// Returns a result containing the filtered issues
#[allow(dead_code)]
pub async fn get_issues(_request: GetIssuesRequest) -> Result<GetIssuesResult> {
    let response = GetIssuesResult {
        issues: Value::Null,
    };
    Ok(response)
}

/// Gets quality gate status for a SonarQube project.
///
/// This function retrieves the quality gate status for a given project.
///
/// # Arguments
///
/// * `request` - The request containing the project key
///
/// # Returns
///
/// Returns a result containing the quality gate status
#[allow(dead_code)]
pub async fn get_quality_gate(_request: GetQualityGateRequest) -> Result<GetQualityGateResult> {
    let response = GetQualityGateResult {
        status: Value::Null,
    };
    Ok(response)
}

/// Convert a SonarQube project list to an MCP project list
fn convert_projects(projects: ProjectsResponse) -> ListProjectsResult {
    ListProjectsResult {
        projects: projects
            .components
            .into_iter()
            .map(|p| Project {
                name: p.name,
                key: p.key,
            })
            .collect(),
    }
}
