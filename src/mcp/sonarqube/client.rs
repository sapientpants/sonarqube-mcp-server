use crate::mcp::sonarqube::tools::SONARQUBE_DEBUG_ENV;
use crate::mcp::sonarqube::types::*;
use reqwest::Client;
use std::sync::Arc;
use std::time::Duration;

// Re-export SonarQubeConfig for use in other modules
pub use crate::mcp::sonarqube::types::SonarQubeConfig;

/// Local debug logging helper
fn debug_log(message: &str) {
    if let Ok(value) = std::env::var(SONARQUBE_DEBUG_ENV) {
        if value == "1" || value.to_lowercase() == "true" {
            eprintln!("[SONARQUBE CLIENT DEBUG] {}", message);
        }
    }
}

/// SonarQube API client
#[derive(Debug)]
pub struct SonarQubeClient {
    /// HTTP client for making requests
    client: Client,
    /// Base URL of the SonarQube server
    base_url: String,
    /// Authentication token for SonarQube API
    token: String,
    /// Organization key (required for SonarCloud or multi-organization instances)
    organization: Option<String>,
}

impl SonarQubeClient {
    /// Create a new SonarQube client with the given configuration
    pub fn new(config: SonarQubeConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to build reqwest client");

        Self {
            client,
            base_url: config.base_url,
            token: config.token,
            organization: config.organization,
        }
    }

    /// Check if this client has an organization configured
    #[allow(dead_code)]
    pub fn has_organization(&self) -> bool {
        self.organization.is_some()
    }

    /// Get the organization name if configured
    #[allow(dead_code)]
    pub fn organization(&self) -> Option<&str> {
        self.organization.as_deref()
    }

    /// Handle HTTP response errors and convert them to SonarError
    async fn handle_response_error(
        &self,
        response: reqwest::Response,
        project_key: &str,
    ) -> Result<reqwest::Response, SonarError> {
        if response.status().is_success() {
            return Ok(response);
        }

        let status = response.status();
        if status.as_u16() == 401 || status.as_u16() == 403 {
            return Err(SonarError::AuthError);
        }
        if status.as_u16() == 404 {
            return Err(SonarError::ProjectNotFound(project_key.to_string()));
        }

        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        Err(SonarError::Api(format!("HTTP {}: {}", status, error_text)))
    }

    /// Parse a response into the specified type, with detailed error handling
    async fn parse_response<T>(
        &self,
        response: reqwest::Response,
        entity_name: &str,
    ) -> Result<T, SonarError>
    where
        T: serde::de::DeserializeOwned,
    {
        // Get the response body as text first for better error messages
        let response_text = response.text().await?;

        // Log the response preview if debug is enabled
        debug_log(&format!(
            "Response body (first 200 chars): {}",
            if response_text.len() > 200 {
                format!("{}...", &response_text[..200])
            } else {
                response_text.clone()
            }
        ));

        // Try to deserialize the response
        match serde_json::from_str::<T>(&response_text) {
            Ok(data) => Ok(data),
            Err(err) => {
                // Create a preview of the response for error messages
                let preview = if response_text.len() > 200 {
                    format!("{}...", &response_text[..200])
                } else {
                    response_text.clone()
                };

                debug_log(&format!(
                    "Failed to parse {} response: {}",
                    entity_name, err
                ));
                Err(SonarError::Parse(format!(
                    "Failed to parse {} response: {} - Response preview: {}",
                    entity_name, err, preview
                )))
            }
        }
    }

    /// Get metrics for a project
    pub async fn get_metrics(
        &self,
        project_key: &str,
        metrics: &[&str],
    ) -> Result<MetricsResponse, SonarError> {
        use crate::mcp::sonarqube::query::QueryBuilder;

        let metrics_str = metrics.join(",");
        let url = QueryBuilder::new(format!("{}/api/measures/component", self.base_url))
            .add_param("component", Some(project_key))
            .add_param("metricKeys", Some(metrics_str))
            .add_param("organization", self.organization.as_deref())
            .build();

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let response = self.handle_response_error(response, project_key).await?;
        self.parse_response::<MetricsResponse>(response, "metrics")
            .await
    }

    /// Get issues for a project
    pub async fn get_issues(
        &self,
        params: IssuesQueryParams<'_>,
    ) -> Result<IssuesResponse, SonarError> {
        use crate::mcp::sonarqube::query::QueryBuilder;

        let url = QueryBuilder::new(format!("{}/api/issues/search", self.base_url))
            // Add required parameters
            .add_param("componentKeys", Some(params.project_key))
            // Add organization parameter if available
            .add_param("organization", self.organization.as_deref())
            // Group 1: Issue classification parameters
            .add_array_param("severities", params.severities)
            .add_array_param("types", params.types)
            .add_array_param("statuses", params.statuses)
            .add_array_param("impactSeverities", params.impact_severities)
            .add_array_param("impactSoftwareQualities", params.impact_software_qualities)
            // Group 2: Issue ownership parameters
            .add_bool_param("assignedToMe", params.assigned_to_me)
            .add_array_param("assignees", params.assignees)
            .add_array_param("authors", params.authors)
            // Group 3: Code location parameters
            .add_array_param("codeVariants", params.code_variants)
            .add_array_param("directories", params.directories)
            .add_array_param("files", params.files)
            .add_array_param("languages", params.languages)
            // Group 4: Time-based parameters
            .add_param("createdAfter", params.created_after)
            .add_param("createdBefore", params.created_before)
            .add_param("createdInLast", params.created_in_last)
            // Group 5: Standard classification parameters
            .add_array_param("cwe", params.cwe)
            .add_array_param("owaspTop10", params.owasp_top10)
            .add_array_param("owaspTop10-2021", params.owasp_top10_2021)
            .add_array_param("sansTop25", params.sans_top25)
            .add_array_param("sonarsourceSecurity", params.sonarsource_security)
            // Group 6: Resolution parameters
            .add_array_param("resolutions", params.resolutions)
            .add_bool_param("resolved", params.resolved)
            .add_array_param("rules", params.rules)
            .add_array_param("tags", params.tags)
            .add_array_param("issueStatuses", params.issue_statuses)
            // Group 7: Response customization parameters
            .add_array_param("facets", params.facets)
            .add_param("s", params.sort_field)
            .add_bool_param("asc", params.asc)
            .add_param("p", params.page)
            .add_param("ps", params.page_size)
            .build();

        // Log the URL for debugging if enabled
        debug_log(&format!("Making request to: {}", url));

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let response = self
            .handle_response_error(response, params.project_key)
            .await?;

        self.parse_response::<IssuesResponse>(response, "issues")
            .await
    }

    /// Get quality gate status for a project
    pub async fn get_quality_gate(
        &self,
        project_key: &str,
    ) -> Result<QualityGateResponse, SonarError> {
        use crate::mcp::sonarqube::query::QueryBuilder;

        let url = QueryBuilder::new(format!("{}/api/qualitygates/project_status", self.base_url))
            .add_param("projectKey", Some(project_key))
            .add_param("organization", self.organization.as_deref())
            .build();

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let response = self.handle_response_error(response, project_key).await?;
        self.parse_response::<QualityGateResponse>(response, "quality gate")
            .await
    }

    /// List all projects in SonarQube
    pub async fn list_projects(
        &self,
        page: Option<u32>,
        page_size: Option<u32>,
        override_organization: Option<&str>,
    ) -> Result<ProjectsResponse, SonarError> {
        use crate::mcp::sonarqube::query::QueryBuilder;

        // Use override_organization if provided, otherwise use the client's organization
        let organization = override_organization.or(self.organization.as_deref());

        let url = QueryBuilder::new(format!("{}/api/components/search", self.base_url))
            .add_param("qualifiers", Some("TRK")) // TRK is for projects
            .add_param("organization", organization)
            .add_param("p", page)
            .add_param("ps", page_size)
            .build();

        debug_log(&format!("Making request to: {}", url));

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        // Use a dummy project key for error handling since we're not querying a specific project
        let response = self.handle_response_error(response, "").await?;

        let result = self
            .parse_response::<ProjectsResponse>(response, "projects")
            .await?;

        debug_log(&format!(
            "Successfully parsed response: {} projects found",
            result.components.len()
        ));

        Ok(result)
    }
}

/// Create a new SonarQube client from configuration
#[allow(dead_code)]
pub fn create_client(config: SonarQubeConfig) -> Arc<SonarQubeClient> {
    Arc::new(SonarQubeClient::new(config))
}
