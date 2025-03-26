use once_cell::sync::OnceCell;
use rpc_router::{Handler, HandlerResult, IntoHandlerError, RouterBuilder};
use serde_json::json;
use std::sync::Arc;

use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::types::*;

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

/// Initialize the SonarQube client
pub fn init_sonarqube_client() -> Result<(), SonarError> {
    // Get environment variables
    let base_url = std::env::var("SONARQUBE_URL").map_err(|_| {
        SonarError::Config("SONARQUBE_URL environment variable not set".to_string())
    })?;

    let token = std::env::var("SONARQUBE_TOKEN").map_err(|_| {
        SonarError::Config("SONARQUBE_TOKEN environment variable not set".to_string())
    })?;

    // Get optional organization
    let organization = std::env::var("SONARQUBE_ORGANIZATION").ok();

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

/// Register SonarQube tools with the router
pub fn register_sonarqube_tools(builder: RouterBuilder) -> RouterBuilder {
    builder
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

    // Define default metrics if none provided
    let metrics = match &request.metrics {
        Some(metrics) => metrics.clone(),
        None => vec![
            "ncloc".to_string(),
            "bugs".to_string(),
            "vulnerabilities".to_string(),
            "code_smells".to_string(),
            "coverage".to_string(),
            "duplicated_lines_density".to_string(),
        ],
    };

    // Convert metrics to string slices
    let metrics_refs: Vec<&str> = metrics.iter().map(|s| s.as_str()).collect();

    // Get metrics from SonarQube
    let response = match client
        .get_metrics(&request.project_key, &metrics_refs)
        .await
    {
        Ok(response) => response,
        Err(e) => {
            // Check specifically for ProjectNotFound error type
            if let SonarError::ProjectNotFound(project_key) = &e {
                return Err(json!({
                    "code": -32603,
                    "message": format!("Project not found: {}", project_key)
                })
                .into_handler_error());
            }

            // Handle other errors
            return Err(json!({
                "code": -32603,
                "message": format!("SonarQube API error: {}", e)
            })
            .into_handler_error());
        }
    };

    // Format the results as text
    let mut text_result = format!("Metrics for project '{}':\n\n", response.component.name);

    // Add each metric to the text result
    for measure in response.component.measures {
        // Check if the metric has a 'bestValue' flag
        let best_value_indicator = if measure.best_value.unwrap_or(false) {
            " ✓"
        } else {
            ""
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
    // STEP 1: Get client and check project exists
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

    // Check if project exists by trying to get metrics for it
    match client.get_metrics(&request.project_key, &["ncloc"]).await {
        Ok(_) => {
            // Project exists, proceed
        }
        Err(e) => {
            if let SonarError::ProjectNotFound(project_key) = e {
                return Err(json!({
                    "code": -32603,
                    "message": format!("Project not found: {}", project_key)
                })
                .into_handler_error());
            }

            // For other errors, continue trying to get issues
            debug_log(&format!("Warning: Error checking project existence: {}", e));
        }
    }

    // STEP 2: Create query parameters
    let mut params = IssuesQueryParams::new(&request.project_key);

    // STEP 3: Set non-vector parameters
    params.assigned_to_me = request.assigned_to_me;
    params.created_after = request.created_after.as_deref();
    params.created_before = request.created_before.as_deref();
    params.created_in_last = request.created_in_last.as_deref();
    params.resolved = request.resolved;
    params.sort_field = request.sort_field.as_deref();
    params.asc = request.asc;
    params.page = request.page;
    params.page_size = request.page_size;

    // STEP 4: Convert and store vector parameters for the API call
    // We'll use these within the scope of this function
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

    // Set the vector parameters in the params
    params.severities = severities_refs.as_deref();
    params.types = types_refs.as_deref();
    params.statuses = statuses_refs.as_deref();

    // STEP 5: Get issues from SonarQube
    let response = match client.get_issues(params).await {
        Ok(response) => response,
        Err(e) => {
            // Check specifically for ProjectNotFound error type
            if let SonarError::ProjectNotFound(project_key) = &e {
                return Err(json!({
                    "code": -32603,
                    "message": format!("Project not found: {}", project_key)
                })
                .into_handler_error());
            }

            // Handle other errors
            return Err(json!({
                "code": -32603,
                "message": format!("SonarQube API error: {}", e)
            })
            .into_handler_error());
        }
    };

    // STEP 6: Format the response
    // Create component lookup map
    let components_map: std::collections::HashMap<String, &Component> = response
        .components
        .iter()
        .map(|c| (c.key.clone(), c))
        .collect();

    // Format the results as text
    let total_pages = if response.total == 0 {
        1 // If there are no issues, we still have 1 page (the current empty page)
    } else {
        response.total.div_ceil(response.ps)
    };

    let mut text_result = format!(
        "Found {} issues for project '{}' (page {} of {}):\n\n",
        response.total, request.project_key, response.p, total_pages
    );

    // STEP 7: Handle the case when no issues are found
    if response.total == 0 {
        // Build information about applied filters
        let mut filters = Vec::new();

        if let Some(sevs) = &request.severities {
            if !sevs.is_empty() {
                filters.push(format!("severities: {}", sevs.join(", ")));
            }
        }

        if let Some(types) = &request.types {
            if !types.is_empty() {
                filters.push(format!("types: {}", types.join(", ")));
            }
        }

        if let Some(statuses) = &request.statuses {
            if !statuses.is_empty() {
                filters.push(format!("statuses: {}", statuses.join(", ")));
            }
        }

        if request.resolved.is_some() {
            filters.push(format!("resolved: {}", request.resolved.unwrap()));
        }

        // Add message explaining why no issues were found
        if filters.is_empty() {
            text_result.push_str("This project has no issues reported in SonarQube.\n");
        } else {
            text_result.push_str(&format!(
                "No issues match the applied filters: {}.\n",
                filters.join("; ")
            ));
        }
    } else {
        // STEP 8: Format each issue
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

        // STEP 9: Add pagination note if needed
        if response.p * response.ps < response.total {
            text_result.push_str(
                "\nNote: More issues available. Use page parameter to view additional issues.",
            );
        }
    }

    // Return the formatted result
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

    // First, verify the project exists by trying to get metrics for it
    // This will return a ProjectNotFound error if the project doesn't exist
    match client.get_metrics(&request.project_key, &["ncloc"]).await {
        Ok(_) => {
            // Project exists, proceed with getting quality gate
        }
        Err(e) => {
            if let SonarError::ProjectNotFound(project_key) = e {
                return Err(json!({
                    "code": -32603,
                    "message": format!("Project not found: {}", project_key)
                })
                .into_handler_error());
            }

            // For other errors, continue, as they may be related to metrics but not to project existence
            debug_log(&format!("Warning: Error checking project existence: {}", e));
        }
    }

    // Get quality gate from SonarQube
    let response = match client.get_quality_gate(&request.project_key).await {
        Ok(response) => response,
        Err(e) => {
            // Check specifically for ProjectNotFound error type
            if let SonarError::ProjectNotFound(project_key) = &e {
                return Err(json!({
                    "code": -32603,
                    "message": format!("Project not found: {}", project_key)
                })
                .into_handler_error());
            }

            // Handle other errors
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

    // Check if conditions array is empty
    if response.project_status.conditions.is_empty() {
        text_result.push_str("No quality gate conditions found for this project.\n\n");
        text_result.push_str("Possible reasons:\n");
        text_result.push_str("1. No quality gate has been assigned to this project\n");
        text_result.push_str("2. The assigned quality gate has no conditions\n");
        text_result.push_str("3. The project hasn't been analyzed yet\n");
    } else {
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
        "Listing SonarQube projects with params: page={:?}, page_size={:?}",
        request.page, request.page_size
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

    // Get projects from SonarQube
    let response = match client
        .list_projects(request.page, request.page_size, None)
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

    // Handle case with no projects
    if response.paging.total == 0 {
        text_result.push_str("No projects found in SonarQube.\n");

        // Add suggestions
        text_result.push_str("\nPossible reasons:\n");
        text_result.push_str("1. No projects have been analyzed in this SonarQube instance\n");
        text_result.push_str("2. The authentication token might not have access to any projects\n");

        if client.has_organization() {
            text_result.push_str(&format!(
                "3. Using organization: '{}' - verify this is correct\n",
                client.organization().unwrap()
            ));
        } else {
            text_result.push_str("3. This SonarQube instance might require an organization parameter. Set SONARQUBE_ORGANIZATION environment variable if needed\n");
        }
    } else {
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
    }

    debug_log("Successfully formatted projects list as text");
    Ok(crate::mcp::types::CallToolResult {
        content: vec![crate::mcp::types::CallToolResultContent::Text { text: text_result }],
        is_error: false,
    })
}
