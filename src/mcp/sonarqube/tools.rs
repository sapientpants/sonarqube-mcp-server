//! SonarQube tools module (deprecated)
//!
//! This module is maintained for backward compatibility and delegates to the feature-specific modules.
//! New code should use the specific feature modules directly instead.

#[deprecated(
    since = "0.3.0",
    note = "Use specific feature modules instead of the combined tools module"
)]
use crate::mcp::errors::{McpError, McpResult};
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::{
    SonarQubeIssuesRequest, SonarQubeListProjectsRequest, SonarQubeMetricsRequest,
    SonarQubeQualityGateRequest,
};
use crate::mcp::types::{CallToolResult, ListProjectsResult};
use jsonrpsee_server::RpcModule;

/// Re-exports for backward compatibility
#[allow(deprecated)]
pub use crate::mcp::sonarqube::config::{
    SONARQUBE_CLIENT, SONARQUBE_DEBUG_ENV, SONARQUBE_ORGANIZATION_ENV, SONARQUBE_TOKEN_ENV,
    SONARQUBE_URL_ENV, get_client, init_sonarqube_client, reset_client,
};

#[allow(unused_imports)]
use crate::mcp::sonarqube::issues::sonarqube_get_issues_legacy;
#[allow(unused_imports)]
use crate::mcp::sonarqube::metrics::sonarqube_get_metrics_legacy;
#[allow(unused_imports)]
use crate::mcp::sonarqube::projects::list_projects_legacy;
#[allow(unused_imports)]
use crate::mcp::sonarqube::quality_gates::sonarqube_get_quality_gate_legacy;

/// Get SonarQube metrics for a project
///
/// This function delegates to the metrics module.
/// New code should use the metrics module directly.
#[deprecated(
    since = "0.3.0",
    note = "Use sonarqube::metrics::sonarqube_get_metrics instead"
)]
pub async fn sonarqube_get_metrics(
    request: SonarQubeMetricsRequest,
    context: &ServerContext,
) -> McpResult<CallToolResult> {
    crate::mcp::sonarqube::metrics::sonarqube_get_metrics(request, context).await
}

/// Get SonarQube issues for a project
///
/// This function delegates to the issues module.
/// New code should use the issues module directly.
#[deprecated(
    since = "0.3.0",
    note = "Use sonarqube::issues::sonarqube_get_issues instead"
)]
pub async fn sonarqube_get_issues(
    request: SonarQubeIssuesRequest,
    context: &ServerContext,
) -> McpResult<CallToolResult> {
    crate::mcp::sonarqube::issues::sonarqube_get_issues(request, context).await
}

/// Get SonarQube quality gate status for a project
///
/// This function delegates to the quality_gates module.
/// New code should use the quality_gates module directly.
#[deprecated(
    since = "0.3.0",
    note = "Use sonarqube::quality_gates::sonarqube_get_quality_gate instead"
)]
pub async fn sonarqube_get_quality_gate(
    request: SonarQubeQualityGateRequest,
    context: &ServerContext,
) -> McpResult<CallToolResult> {
    crate::mcp::sonarqube::quality_gates::sonarqube_get_quality_gate(request, context).await
}

/// List SonarQube projects
///
/// This function delegates to the projects module.
/// New code should use the projects module directly.
#[deprecated(
    since = "0.3.0",
    note = "Use sonarqube::projects::list_projects instead"
)]
pub async fn list_projects(
    request: Option<SonarQubeListProjectsRequest>,
    context: &ServerContext,
) -> McpResult<ListProjectsResult> {
    crate::mcp::sonarqube::projects::list_projects(request, context).await
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
#[deprecated(
    since = "0.3.0",
    note = "Use the #[tool] attribute macro for tool registration"
)]
pub fn register_sonarqube_tools(module: &mut RpcModule<()>) -> McpResult<()> {
    tracing::info!(
        "Legacy register_sonarqube_tools called - tools are now registered via RMCP SDK"
    );

    module
        .register_async_method("sonarqube/metrics", |params, _| async move {
            let request = params.parse::<SonarQubeMetricsRequest>()?;
            sonarqube_get_metrics_legacy(request)
                .await
                .map_err(|e| e.to_error_object())
        })
        .map_err(|e| {
            McpError::InternalError(format!("Failed to register sonarqube/metrics: {}", e))
        })?;

    module
        .register_async_method("sonarqube/issues", |params, _| async move {
            let request = params.parse::<SonarQubeIssuesRequest>()?;
            sonarqube_get_issues_legacy(request)
                .await
                .map_err(|e| e.to_error_object())
        })
        .map_err(|e| {
            McpError::InternalError(format!("Failed to register sonarqube/issues: {}", e))
        })?;

    module
        .register_async_method("sonarqube/quality_gate", |params, _| async move {
            let request = params.parse::<SonarQubeQualityGateRequest>()?;
            sonarqube_get_quality_gate_legacy(request)
                .await
                .map_err(|e| e.to_error_object())
        })
        .map_err(|e| {
            McpError::InternalError(format!("Failed to register sonarqube/quality_gate: {}", e))
        })?;

    module
        .register_async_method("sonarqube/projects", |params, _| async move {
            let request = params.parse::<SonarQubeListProjectsRequest>()?;
            list_projects_legacy(Some(request))
                .await
                .map_err(|e| e.to_error_object())
        })
        .map_err(|e| {
            McpError::InternalError(format!("Failed to register sonarqube/projects: {}", e))
        })?;

    Ok(())
}

/// Test utilities for SonarQube tools
#[cfg(test)]
pub mod test_utils {
    #[allow(deprecated)]
    pub use crate::mcp::sonarqube::config::test_utils::reset_sonarqube_client;
}
