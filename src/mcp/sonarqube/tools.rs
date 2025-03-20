use crate::mcp::sonarqube::client::{create_client, SonarQubeClient, SonarQubeConfig};
use crate::mcp::sonarqube::types::*;
use once_cell::sync::OnceCell;
use rpc_router::{Handler, HandlerResult, IntoHandlerError, RouterBuilder};
use serde_json::json;
use std::sync::Arc;

/// Global SonarQube client for tools to use
pub static SONARQUBE_CLIENT: OnceCell<Arc<SonarQubeClient>> = OnceCell::new();

/// Debug logging helper for internal diagnostics
fn debug_log(message: &str) {
    if let Ok(value) = std::env::var("SONARQUBE_DEBUG") {
        if value == "1" || value.to_lowercase() == "true" {
            eprintln!("[SONARQUBE DEBUG] {}", message);
        }
    }
}

/// Initialize the SonarQube client with configuration from environment variables
pub fn init_sonarqube_client() -> Result<(), SonarError> {
    let base_url = std::env::var("SONARQUBE_URL").map_err(|_| {
        SonarError::Config("SONARQUBE_URL environment variable not set".to_string())
    })?;

    let token = std::env::var("SONARQUBE_TOKEN").map_err(|_| {
        SonarError::Config("SONARQUBE_TOKEN environment variable not set".to_string())
    })?;

    // Get optional organization
    let organization = std::env::var("SONARQUBE_ORGANIZATION").ok();

    let config = SonarQubeConfig {
        base_url,
        token,
        organization,
    };

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
        .append_dyn("sonarqube_get_metrics", sonarqube_get_metrics.into_dyn())
        .append_dyn("sonarqube_get_issues", sonarqube_get_issues.into_dyn())
        .append_dyn(
            "sonarqube_get_quality_gate",
            sonarqube_get_quality_gate.into_dyn(),
        )
        .append_dyn(
            "sonarqube_list_projects",
            sonarqube_list_projects.into_dyn(),
        )
}

/// MCP tool to get metrics for a project
pub async fn sonarqube_get_metrics(
    request: SonarQubeMetricsRequest,
) -> HandlerResult<crate::mcp::types::CallToolResult> {
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

    // Format the results as text
    let mut text_result = format!(
        "Metrics for project '{}' ({}):\n\n",
        response.component.name, response.component.key
    );

    // Add each metric to the text result
    for measure in &response.component.measures {
        let best_value_indicator = match measure.best_value {
            Some(true) => " (best value)",
            _ => "",
        };

        text_result.push_str(&format!(
            "- {}: {}{}\n",
            measure.metric, measure.value, best_value_indicator
        ));
    }

    Ok(crate::mcp::types::CallToolResult {
        content: vec![crate::mcp::types::CallToolResultContent::Text { text: text_result }],
        is_error: false,
    })
}

/// MCP tool to get issues for a project
pub async fn sonarqube_get_issues(
    request: SonarQubeIssuesRequest,
) -> HandlerResult<crate::mcp::types::CallToolResult> {
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

    // Format the results as text
    let mut text_result = format!(
        "Found {} issues for project '{}' (page {} of {}):\n\n",
        response.total,
        request.project_key,
        response.p,
        response.total.div_ceil(response.ps)
    );

    // Add each issue to the text result
    for issue in &response.issues {
        let component_name = components_map
            .get(&issue.component)
            .map(|c| c.name.clone())
            .unwrap_or_else(|| issue.component.clone());

        let line_info = issue
            .line
            .map(|line| format!(", line {}", line))
            .unwrap_or_else(|| String::from(""));

        text_result.push_str(&format!(
            "- [{}] {} ({}{})\n  Rule: {}, Status: {}\n  {}\n\n",
            issue.severity,
            component_name,
            issue.component,
            line_info,
            issue.rule,
            issue.status,
            issue.message
        ));
    }

    // If there are more pages, add a note
    if response.p * response.ps < response.total {
        text_result.push_str(
            "\nNote: More issues available. Use page parameter to view additional issues.",
        );
    }

    Ok(crate::mcp::types::CallToolResult {
        content: vec![crate::mcp::types::CallToolResultContent::Text { text: text_result }],
        is_error: false,
    })
}

/// MCP tool to get quality gate status for a project
pub async fn sonarqube_get_quality_gate(
    request: SonarQubeQualityGateRequest,
) -> HandlerResult<crate::mcp::types::CallToolResult> {
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

    // Format the results as text
    let status_display = if response.project_status.status == "OK" {
        "PASSED ✅"
    } else {
        "FAILED ❌"
    };

    let mut text_result = format!(
        "Quality Gate for project '{}': {}\n\nConditions:\n",
        request.project_key, status_display
    );

    // Add each condition to the text result
    for condition in &response.project_status.conditions {
        let status_icon = match condition.status.as_str() {
            "OK" => "✅",
            "ERROR" => "❌",
            _ => "⚠️",
        };

        text_result.push_str(&format!(
            "- {} {} ({}): Actual value: {} vs Threshold: {}\n",
            status_icon,
            condition.metric_key,
            condition.comparator,
            condition.actual_value,
            condition.error_threshold
        ));
    }

    Ok(crate::mcp::types::CallToolResult {
        content: vec![crate::mcp::types::CallToolResultContent::Text { text: text_result }],
        is_error: false,
    })
}

/// MCP tool to list SonarQube projects
pub async fn sonarqube_list_projects(
    request: SonarQubeListProjectsRequest,
) -> HandlerResult<crate::mcp::types::CallToolResult> {
    debug_log(&format!(
        "Listing SonarQube projects with params: page={:?}, page_size={:?}, organization={:?}",
        request.page, request.page_size, request.organization
    ));

    // Get client
    let client = match get_client() {
        Ok(client) => client,
        Err(e) => {
            debug_log(&format!("Failed to get SonarQube client: {}", e));
            return Err(json!({
                "code": -32603,
                "message": format!("Internal error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Get org from request if provided
    let org_ref = request.organization.as_deref();

    // Get projects from SonarQube
    let response = match client
        .list_projects(request.page, request.page_size, org_ref)
        .await
    {
        Ok(response) => {
            debug_log(&format!(
                "Successfully retrieved {} projects",
                response.components.len()
            ));
            response
        }
        Err(e) => {
            debug_log(&format!("Error retrieving SonarQube projects: {}", e));
            let error_message = match e {
                SonarError::Api(msg) if msg.contains("organization") => {
                    format!("SonarQube API error: {}. This instance may require an organization parameter. Set the SONARQUBE_ORGANIZATION environment variable or provide 'organization' in the request.", msg)
                }
                SonarError::Parse(msg) => {
                    format!("Error parsing SonarQube response: {}. The API schema may have changed or there might be missing fields.", msg)
                }
                _ => format!("SonarQube API error: {}", e),
            };

            return Err(json!({
                "code": -32603,
                "message": error_message
            })
            .into_handler_error());
        }
    };

    // Format the results as a text string
    let mut text_result = format!(
        "Found {} SonarQube projects (page {} of {}):\n\n",
        response.paging.total,
        response.paging.page_index,
        response.paging.total.div_ceil(response.paging.page_size)
    );

    // Add each project to the text result
    for project in &response.components {
        let last_analysis = project
            .last_analysis_date
            .as_ref()
            .map(|date| format!(" (last analyzed: {})", date))
            .unwrap_or_else(|| String::from(""));

        text_result.push_str(&format!(
            "- {}: {}{}\n",
            project.name, project.key, last_analysis
        ));
    }

    // If there are more pages, add a note
    if response.paging.page_index * response.paging.page_size < response.paging.total {
        text_result.push_str(
            "\nNote: More projects available. Use page parameter to view additional projects.",
        );
    }

    debug_log("Successfully formatted projects list as text");
    Ok(crate::mcp::types::CallToolResult {
        content: vec![crate::mcp::types::CallToolResultContent::Text { text: text_result }],
        is_error: false,
    })
}
