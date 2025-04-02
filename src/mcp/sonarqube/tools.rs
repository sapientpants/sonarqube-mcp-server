use once_cell::sync::OnceCell;
use std::sync::Arc;
use std::sync::Mutex;

use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::{
    IssuesQueryParams, ProjectsResponse, SonarError, SonarQubeConfig, SonarQubeIssuesRequest,
    SonarQubeListProjectsRequest, SonarQubeMetricsRequest, SonarQubeQualityGateRequest,
};
use crate::mcp::types::{CallToolResult, CallToolResultContent, ListProjectsResult, Project};
use anyhow::Result;
use jsonrpsee_server::RpcModule;
use jsonrpsee_types::ErrorObject;

// Static constants for environment variable names
/// SonarQube server URL environment variable
///
/// This environment variable should be set to the base URL of the SonarQube server
/// that the client will connect to (e.g., "https://sonarqube.example.com").
pub static SONARQUBE_URL_ENV: &str = "SONARQUBE_URL";

/// SonarQube authentication token environment variable
///
/// This environment variable should be set to a valid authentication token
/// that grants access to the SonarQube API.
pub static SONARQUBE_TOKEN_ENV: &str = "SONARQUBE_TOKEN";

/// SonarQube organization identifier environment variable (optional)
///
/// This optional environment variable can be set to specify a SonarQube organization
/// when using SonarCloud or a multi-organization SonarQube instance.
pub static SONARQUBE_ORGANIZATION_ENV: &str = "SONARQUBE_ORGANIZATION";

/// SonarQube debug mode environment variable (optional)
///
/// When set to a truthy value, enables additional debug logging for
/// SonarQube client operations.
pub static SONARQUBE_DEBUG_ENV: &str = "SONARQUBE_DEBUG";

/// Global SonarQube client for tools to use (deprecated)
///
/// This global variable provides a singleton instance of the SonarQube client
/// that can be accessed by all tools. It's initialized during server startup.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should use the ServerContext for dependency injection instead.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext for dependency injection instead of global state"
)]
pub static SONARQUBE_CLIENT: Mutex<OnceCell<Arc<SonarQubeClient>>> = Mutex::new(OnceCell::new());

/// Initialize the SonarQube client (deprecated)
///
/// This function creates and initializes a SonarQube client instance using
/// environment variables. It sets up the client with the SonarQube server URL,
/// authentication token, and optional organization.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should use the ServerContext.from_env() method instead.
///
/// # Returns
///
/// A result indicating success or error. An error is returned if required
/// environment variables are missing or the client cannot be initialized.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext::from_env() instead of this function for dependency injection"
)]
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
    #[allow(deprecated)]
    SONARQUBE_CLIENT
        .lock()
        .unwrap()
        .set(Arc::new(client))
        .map_err(|_| SonarError::Config("Failed to set SonarQube client".to_string()))?;

    Ok(())
}

/// Get the SonarQube client instance (deprecated)
///
/// This function retrieves the global SonarQube client instance.
/// It should be called after the client has been initialized.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should use the ServerContext for dependency injection instead.
///
/// # Returns
///
/// A result containing a reference to the SonarQube client on success,
/// or an error if the client has not been initialized.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext for dependency injection instead of global state"
)]
pub fn get_client() -> Result<Arc<SonarQubeClient>, SonarError> {
    #[allow(deprecated)]
    SONARQUBE_CLIENT
        .lock()
        .unwrap()
        .get()
        .cloned()
        .ok_or_else(|| SonarError::Config(
            "SonarQube client not initialized. Make sure SONARQUBE_URL and SONARQUBE_TOKEN environment variables are set.".to_string()
        ))
}

/// Registers all SonarQube-related tools with the router (legacy implementation).
///
/// This function initializes all tools that interact with the SonarQube API,
/// including tools for fetching metrics, issues, quality gate status, and
/// listing projects.
///
/// Note: This is a legacy implementation kept for backward compatibility.
/// The RMCP SDK now handles tool registration directly through the #[tool]
/// attribute macro.
///
/// # Arguments
///
/// * `module` - The RPC module to register tools with
///
/// # Returns
///
/// Returns the RPC module with SonarQube tools registered
pub fn register_sonarqube_tools(module: &mut RpcModule<()>) -> Result<()> {
    tracing::info!(
        "Legacy register_sonarqube_tools called - tools are now registered via RMCP SDK"
    );

    module.register_async_method("sonarqube/metrics", |params, _| async move {
        let request = params.parse::<SonarQubeMetricsRequest>()?;
        sonarqube_get_metrics_legacy(request)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    module.register_async_method("sonarqube/issues", |params, _| async move {
        let request = params.parse::<SonarQubeIssuesRequest>()?;
        sonarqube_get_issues_legacy(request)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    module.register_async_method("sonarqube/quality_gate", |params, _| async move {
        let request = params.parse::<SonarQubeQualityGateRequest>()?;
        sonarqube_get_quality_gate_legacy(request)
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    module.register_async_method("sonarqube/projects", |params, _| async move {
        let request = params.parse::<SonarQubeListProjectsRequest>()?;
        list_projects_legacy(Some(request))
            .await
            .map_err(|e| ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>))
    })?;

    Ok(())
}

/// Legacy wrapper for sonarqube_get_metrics that uses global state
///
/// This is kept for backward compatibility.
async fn sonarqube_get_metrics_legacy(request: SonarQubeMetricsRequest) -> Result<CallToolResult> {
    #[allow(deprecated)]
    let client = get_client()?;

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
) -> Result<CallToolResult> {
    sonarqube_get_metrics_with_client(request, context.client()).await
}

/// Internal implementation for sonarqube_get_metrics that works with a provided client
async fn sonarqube_get_metrics_with_client(
    request: SonarQubeMetricsRequest,
    client: Arc<SonarQubeClient>,
) -> Result<CallToolResult> {
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

/// Legacy wrapper for sonarqube_get_issues that uses global state
///
/// This is kept for backward compatibility.
async fn sonarqube_get_issues_legacy(request: SonarQubeIssuesRequest) -> Result<CallToolResult> {
    #[allow(deprecated)]
    let client = get_client()?;

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
) -> Result<CallToolResult> {
    sonarqube_get_issues_with_client(request, context.client()).await
}

/// Internal implementation for sonarqube_get_issues that works with a provided client
async fn sonarqube_get_issues_with_client(
    request: SonarQubeIssuesRequest,
    client: Arc<SonarQubeClient>,
) -> Result<CallToolResult> {
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

/// Legacy wrapper for sonarqube_get_quality_gate that uses global state
///
/// This is kept for backward compatibility.
async fn sonarqube_get_quality_gate_legacy(
    request: SonarQubeQualityGateRequest,
) -> Result<CallToolResult> {
    #[allow(deprecated)]
    let client = get_client()?;

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
) -> Result<CallToolResult> {
    sonarqube_get_quality_gate_with_client(request, context.client()).await
}

/// Internal implementation for sonarqube_get_quality_gate that works with a provided client
async fn sonarqube_get_quality_gate_with_client(
    request: SonarQubeQualityGateRequest,
    client: Arc<SonarQubeClient>,
) -> Result<CallToolResult> {
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

/// Legacy wrapper for list_projects that uses global state
///
/// This is kept for backward compatibility.
async fn list_projects_legacy(
    request: Option<SonarQubeListProjectsRequest>,
) -> Result<ListProjectsResult> {
    #[allow(deprecated)]
    let client = get_client()?;

    list_projects_with_client(request, client).await
}

/// Lists all available SonarQube projects.
///
/// This function retrieves a list of all projects from the SonarQube instance.
///
/// # Arguments
///
/// * `request` - Optional parameters for pagination
/// * `context` - The server context containing dependencies
///
/// # Returns
///
/// Returns a result containing the list of projects
pub async fn list_projects(
    request: Option<SonarQubeListProjectsRequest>,
    context: &ServerContext,
) -> Result<ListProjectsResult> {
    list_projects_with_client(request, context.client()).await
}

/// Internal implementation for list_projects that works with a provided client
async fn list_projects_with_client(
    request: Option<SonarQubeListProjectsRequest>,
    client: Arc<SonarQubeClient>,
) -> Result<ListProjectsResult> {
    // Extract request parameters if provided
    let (page, page_size, org_str) = match request {
        Some(req) => {
            let org_str = req.organization.clone();
            (req.page, req.page_size, org_str)
        }
        None => (None, None, None),
    };

    // Get list of projects
    let org = org_str.as_deref();
    let projects = client.list_projects(page, page_size, org).await?;

    // Convert to ListProjectsResult
    Ok(convert_projects(projects))
}

/// Converts SonarQube ProjectsResponse to ListProjectsResult
///
/// This helper function transforms the SonarQube API response into
/// the MCP tool response format.
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

/// Resets the global SonarQube client (deprecated)
///
/// This function clears the global SonarQube client instance,
/// allowing it to be reinitialized. This is primarily used in
/// testing scenarios to ensure a clean state between tests.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should not rely on global state.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext for dependency injection instead of global state"
)]
pub fn reset_client() {
    #[allow(deprecated)]
    SONARQUBE_CLIENT.lock().unwrap().take();
}

#[cfg(test)]
pub mod test_utils {
    use super::*;

    /// Resets the SonarQube client for testing (deprecated)
    ///
    /// This function clears the global SonarQube client instance and adds
    /// additional synchronization operations to ensure thread safety during tests.
    /// It includes a memory fence and a small delay to avoid race conditions.
    ///
    /// Note: This is deprecated and maintained only for backward compatibility.
    /// New tests should use ServerContext for dependency injection instead.
    #[deprecated(
        since = "0.3.0",
        note = "Use ServerContext for dependency injection in tests instead of global state"
    )]
    pub fn reset_sonarqube_client() {
        let mut guard = SONARQUBE_CLIENT.lock().unwrap();
        let _ = guard.take();
        std::sync::atomic::fence(std::sync::atomic::Ordering::SeqCst);
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
}
