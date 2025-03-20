use crate::mcp::sonarqube::client::{create_client, SonarQubeClient, SonarQubeConfig};
use crate::mcp::sonarqube::types::*;
use once_cell::sync::OnceCell;
use rpc_router::{Handler, HandlerResult, IntoHandlerError, RouterBuilder};
use serde_json::json;
use std::sync::Arc;

/// Global SonarQube client for tools to use
pub static SONARQUBE_CLIENT: OnceCell<Arc<SonarQubeClient>> = OnceCell::new();

/// Initialize the SonarQube client with configuration from environment variables
pub fn init_sonarqube_client() -> Result<(), SonarError> {
    let base_url = std::env::var("SONARQUBE_URL").map_err(|_| {
        SonarError::Config("SONARQUBE_URL environment variable not set".to_string())
    })?;

    let token = std::env::var("SONARQUBE_TOKEN").map_err(|_| {
        SonarError::Config("SONARQUBE_TOKEN environment variable not set".to_string())
    })?;

    let config = SonarQubeConfig { base_url, token };

    let client = create_client(config);
    SONARQUBE_CLIENT
        .set(client)
        .map_err(|_| SonarError::Config("Failed to initialize SonarQube client".to_string()))?;

    Ok(())
}

/// Get the SonarQube client instance
pub fn get_client() -> Result<&'static Arc<SonarQubeClient>, SonarError> {
    SONARQUBE_CLIENT
        .get()
        .ok_or_else(|| SonarError::Config("SonarQube client not initialized".to_string()))
}

/// Register SonarQube tools to the router
pub fn register_sonarqube_tools(router_builder: RouterBuilder) -> RouterBuilder {
    router_builder
        .append_dyn("sonarqube/get_metrics", sonarqube_get_metrics.into_dyn())
        .append_dyn("sonarqube/get_issues", sonarqube_get_issues.into_dyn())
        .append_dyn(
            "sonarqube/get_quality_gate",
            sonarqube_get_quality_gate.into_dyn(),
        )
        .append_dyn(
            "sonarqube/list_projects",
            sonarqube_list_projects.into_dyn(),
        )
}

/// MCP tool to get metrics for a project
pub async fn sonarqube_get_metrics(
    request: SonarQubeMetricsRequest,
) -> HandlerResult<SonarQubeMetricsResult> {
    // Get client
    let client = match get_client() {
        Ok(client) => client,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("Internal error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Default metrics if none provided
    let metrics_vec = request.metrics.unwrap_or_else(|| {
        vec![
            "ncloc".to_string(),
            "bugs".to_string(),
            "vulnerabilities".to_string(),
            "code_smells".to_string(),
            "coverage".to_string(),
            "duplicated_lines_density".to_string(),
        ]
    });

    // Convert Vec<String> to Vec<&str> for client
    let metrics_refs: Vec<&str> = metrics_vec.iter().map(|s| s.as_str()).collect();

    // Get metrics from SonarQube
    let response = match client
        .get_metrics(&request.project_key, &metrics_refs)
        .await
    {
        Ok(response) => response,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("SonarQube API error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Map response to the tool result format
    let result = SonarQubeMetricsResult {
        project_name: response.component.name,
        project_key: response.component.key,
        metrics: response
            .component
            .measures
            .into_iter()
            .map(|m| MetricValue {
                key: m.metric,
                value: m.value,
                best_value: m.best_value,
            })
            .collect(),
    };

    Ok(result)
}

/// MCP tool to get issues for a project
pub async fn sonarqube_get_issues(
    request: SonarQubeIssuesRequest,
) -> HandlerResult<SonarQubeIssuesResult> {
    // Get client
    let client = match get_client() {
        Ok(client) => client,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("Internal error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Convert option vectors to references for client
    let severities_ref: Option<Vec<&str>> = request
        .severities
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());

    let types_ref: Option<Vec<&str>> = request
        .types
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());

    // Get issues from SonarQube
    let response = match client
        .get_issues(
            &request.project_key,
            severities_ref.as_deref(),
            types_ref.as_deref(),
            request.page,
            request.page_size,
        )
        .await
    {
        Ok(response) => response,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("SonarQube API error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Create component lookup map
    let components_map: std::collections::HashMap<String, &Component> = response
        .components
        .iter()
        .map(|c| (c.key.clone(), c))
        .collect();

    // Map response to the tool result format
    let result = SonarQubeIssuesResult {
        total: response.total,
        page: response.p,
        page_size: response.ps,
        issues: response
            .issues
            .into_iter()
            .map(|i| {
                let component_name = components_map.get(&i.component).map(|c| c.name.clone());

                IssueInfo {
                    key: i.key,
                    rule: i.rule,
                    severity: i.severity,
                    component: i.component,
                    component_name,
                    line: i.line,
                    message: i.message,
                    issue_type: i.issue_type,
                    status: i.status,
                }
            })
            .collect(),
    };

    Ok(result)
}

/// MCP tool to get quality gate status for a project
pub async fn sonarqube_get_quality_gate(
    request: SonarQubeQualityGateRequest,
) -> HandlerResult<SonarQubeQualityGateResult> {
    // Get client
    let client = match get_client() {
        Ok(client) => client,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("Internal error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Get quality gate from SonarQube
    let response = match client.get_quality_gate(&request.project_key).await {
        Ok(response) => response,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("SonarQube API error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Map response to the tool result format
    let result = SonarQubeQualityGateResult {
        status: response.project_status.status.clone(),
        passes_quality_gate: response.project_status.status == "OK",
        conditions: response
            .project_status
            .conditions
            .into_iter()
            .map(|c| QualityGateCondition {
                metric: c.metric_key,
                comparator: c.comparator,
                threshold: c.error_threshold,
                actual_value: c.actual_value,
                status: c.status,
            })
            .collect(),
    };

    Ok(result)
}

/// MCP tool to list SonarQube projects
pub async fn sonarqube_list_projects(
    request: SonarQubeListProjectsRequest,
) -> HandlerResult<SonarQubeListProjectsResult> {
    // Get client
    let client = match get_client() {
        Ok(client) => client,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("Internal error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Get projects from SonarQube
    let response = match client.list_projects(request.page, request.page_size).await {
        Ok(response) => response,
        Err(e) => {
            return Err(json!({
                "code": -32603,
                "message": format!("SonarQube API error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Map response to the tool result format
    let result = SonarQubeListProjectsResult {
        total: response.paging.total,
        page: response.paging.page_index,
        page_size: response.paging.page_size,
        projects: response.components,
    };

    Ok(result)
}
