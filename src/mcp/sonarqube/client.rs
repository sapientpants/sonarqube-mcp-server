use crate::mcp::sonarqube::types::*;
use reqwest::Client;
use std::sync::Arc;

// Re-export SonarQubeConfig for use in other modules
pub use crate::mcp::sonarqube::types::SonarQubeConfig;

// Static constants for environment variable names
static SONARQUBE_DEBUG_ENV: &str = "SONARQUBE_DEBUG";

/// Local debug logging helper
fn debug_log(message: &str) {
    if let Ok(value) = std::env::var(SONARQUBE_DEBUG_ENV) {
        if value == "1" || value.to_lowercase() == "true" {
            eprintln!("[SONARQUBE CLIENT DEBUG] {}", message);
        }
    }
}

/// SonarQube API client
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
        Self {
            client: Client::new(),
            base_url: config.base_url,
            token: config.token,
            organization: config.organization,
        }
    }

    /// Check if this client has an organization configured
    pub fn has_organization(&self) -> bool {
        self.organization.is_some()
    }

    /// Get the organization name if configured
    pub fn organization(&self) -> Option<&str> {
        self.organization.as_deref()
    }

    /// Append a string parameter to the URL if it exists
    fn append_param(&self, url: &mut String, name: &str, value: Option<&str>) {
        if let Some(val) = value {
            url.push_str(&format!("&{}={}", name, val));
        }
    }

    /// Append a boolean parameter to the URL if it exists
    fn append_bool_param(&self, url: &mut String, name: &str, value: Option<bool>) {
        if let Some(val) = value {
            url.push_str(&format!("&{}={}", name, val));
        }
    }

    /// Append a numeric parameter to the URL if it exists
    fn append_numeric_param<T: std::fmt::Display>(&self, url: &mut String, name: &str, value: Option<T>) {
        if let Some(val) = value {
            url.push_str(&format!("&{}={}", name, val));
        }
    }

    /// Append an array parameter as comma-separated values if it exists
    fn append_array_param<'a>(&self, url: &mut String, name: &str, values: Option<&'a [&'a str]>) {
        if let Some(vals) = values {
            if !vals.is_empty() {
                url.push_str(&format!("&{}={}", name, vals.join(",")));
            }
        }
    }

    /// Handle HTTP response errors and convert them to SonarError
    async fn handle_response_error(
        &self, 
        response: reqwest::Response, 
        project_key: &str
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

    /// Get metrics for a project
    pub async fn get_metrics(
        &self,
        project_key: &str,
        metrics: &[&str],
    ) -> Result<MetricsResponse, SonarError> {
        let metrics_str = metrics.join(",");
        let mut url = format!(
            "{}/api/measures/component?component={}&metricKeys={}",
            self.base_url, project_key, metrics_str
        );

        // Add organization parameter if available
        if let Some(org) = &self.organization {
            url.push_str(&format!("&organization={}", org));
        }

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let response = self.handle_response_error(response, project_key).await?;

        // Get the response body as text first for better error messages
        let response_text = response.text().await?;

        // Try to deserialize the response
        match serde_json::from_str::<MetricsResponse>(&response_text) {
            Ok(data) => Ok(data),
            Err(err) => {
                // Log or capture part of the response for debugging
                let preview = if response_text.len() > 200 {
                    format!("{}...", &response_text[..200])
                } else {
                    response_text.clone()
                };

                Err(SonarError::Parse(format!(
                    "Failed to parse metrics response: {} - Response preview: {}",
                    err, preview
                )))
            }
        }
    }

    /// Get issues for a project
    pub async fn get_issues(
        &self,
        params: IssuesQueryParams<'_>,
    ) -> Result<IssuesResponse, SonarError> {
        let mut url = format!(
            "{}/api/issues/search?componentKeys={}",
            self.base_url, params.project_key
        );

        // Add organization parameter if available
        self.append_param(&mut url, "organization", self.organization.as_deref());

        // Add optional parameters if provided
        self.append_array_param(&mut url, "severities", params.severities);
        self.append_array_param(&mut url, "types", params.types);
        self.append_array_param(&mut url, "statuses", params.statuses);
        self.append_array_param(&mut url, "impactSeverities", params.impact_severities);
        self.append_array_param(&mut url, "impactSoftwareQualities", params.impact_software_qualities);
        
        // Add new parameters
        self.append_bool_param(&mut url, "assignedToMe", params.assigned_to_me);
        self.append_array_param(&mut url, "assignees", params.assignees);
        self.append_array_param(&mut url, "authors", params.authors);
        self.append_array_param(&mut url, "codeVariants", params.code_variants);
        self.append_param(&mut url, "createdAfter", params.created_after);
        self.append_param(&mut url, "createdBefore", params.created_before);
        self.append_param(&mut url, "createdInLast", params.created_in_last);
        self.append_array_param(&mut url, "cwe", params.cwe);
        self.append_array_param(&mut url, "directories", params.directories);
        self.append_array_param(&mut url, "facets", params.facets);
        self.append_array_param(&mut url, "files", params.files);
        self.append_array_param(&mut url, "issueStatuses", params.issue_statuses);
        self.append_array_param(&mut url, "languages", params.languages);
        self.append_array_param(&mut url, "owaspTop10", params.owasp_top10);
        self.append_array_param(&mut url, "owaspTop10-2021", params.owasp_top10_2021);
        self.append_array_param(&mut url, "resolutions", params.resolutions);
        self.append_bool_param(&mut url, "resolved", params.resolved);
        self.append_array_param(&mut url, "rules", params.rules);
        self.append_array_param(&mut url, "sansTop25", params.sans_top25);
        self.append_array_param(&mut url, "sonarsourceSecurity", params.sonarsource_security);
        self.append_array_param(&mut url, "tags", params.tags);
        self.append_param(&mut url, "s", params.sort_field);
        self.append_bool_param(&mut url, "asc", params.asc);
        self.append_numeric_param(&mut url, "p", params.page);
        self.append_numeric_param(&mut url, "ps", params.page_size);

        // Log the URL for debugging if enabled
        debug_log(&format!("Making request to: {}", url));

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let response = self.handle_response_error(response, params.project_key).await?;

        // Get the response body as text first for better error messages
        let response_text = response.text().await?;

        // Try to deserialize the response
        match serde_json::from_str::<IssuesResponse>(&response_text) {
            Ok(data) => Ok(data),
            Err(err) => {
                // Log or capture part of the response for debugging
                let preview = if response_text.len() > 200 {
                    format!("{}...", &response_text[..200])
                } else {
                    response_text.clone()
                };

                Err(SonarError::Parse(format!(
                    "Failed to parse issues response: {} - Response preview: {}",
                    err, preview
                )))
            }
        }
    }

    /// Get quality gate status for a project
    pub async fn get_quality_gate(
        &self,
        project_key: &str,
    ) -> Result<QualityGateResponse, SonarError> {
        let mut url = format!(
            "{}/api/qualitygates/project_status?projectKey={}",
            self.base_url, project_key
        );

        // Add organization parameter if available
        if let Some(org) = &self.organization {
            url.push_str(&format!("&organization={}", org));
        }

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let response = self.handle_response_error(response, project_key).await?;

        // Get the response body as text first for better error messages
        let response_text = response.text().await?;

        // Try to deserialize the response
        match serde_json::from_str::<QualityGateResponse>(&response_text) {
            Ok(data) => Ok(data),
            Err(err) => {
                // Log or capture part of the response for debugging
                let preview = if response_text.len() > 200 {
                    format!("{}...", &response_text[..200])
                } else {
                    response_text.clone()
                };

                Err(SonarError::Parse(format!(
                    "Failed to parse quality gate response: {} - Response preview: {}",
                    err, preview
                )))
            }
        }
    }

    /// Get list of projects from SonarQube
    pub async fn list_projects(
        &self,
        page: Option<u32>,
        page_size: Option<u32>,
        override_organization: Option<&str>,
    ) -> Result<ProjectsResponse, SonarError> {
        let mut url = format!("{}/api/components/search?qualifiers=TRK", self.base_url);

        // Add organization parameter (prefer override if provided)
        if let Some(org) = override_organization {
            url.push_str(&format!("&organization={}", org));
            debug_log(&format!("Using override organization: {}", org));
        } else if let Some(org) = &self.organization {
            url.push_str(&format!("&organization={}", org));
            debug_log(&format!("Using default organization: {}", org));
        } else {
            debug_log("No organization specified");
        }

        // Add pagination parameters if provided
        if let Some(p) = page {
            url.push_str(&format!("&p={}", p));
        }

        if let Some(ps) = page_size {
            url.push_str(&format!("&ps={}", ps));
        }

        debug_log(&format!("Making request to: {}", url));

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        let status = response.status();
        debug_log(&format!("Received response status: {}", status));

        let response = self.handle_response_error(response, "").await?;

        // Get the response body as text first for better error messages
        let response_text = response.text().await?;
        debug_log(&format!(
            "Response body (first 200 chars): {}",
            if response_text.len() > 200 {
                format!("{}...", &response_text[..200])
            } else {
                response_text.clone()
            }
        ));

        // Try to deserialize the response
        match serde_json::from_str::<ProjectsResponse>(&response_text) {
            Ok(data) => {
                debug_log(&format!(
                    "Successfully parsed response: {} projects found",
                    data.components.len()
                ));
                Ok(data)
            }
            Err(err) => {
                // Log or capture part of the response for debugging
                let preview = if response_text.len() > 200 {
                    format!("{}...", &response_text[..200])
                } else {
                    response_text.clone()
                };

                debug_log(&format!("Failed to parse response: {}", err));
                Err(SonarError::Parse(format!(
                    "Failed to parse response: {} - Response preview: {}",
                    err, preview
                )))
            }
        }
    }
}

/// Create a new SonarQube client from configuration
#[allow(dead_code)]
pub fn create_client(config: SonarQubeConfig) -> Arc<SonarQubeClient> {
    Arc::new(SonarQubeClient::new(config))
}
