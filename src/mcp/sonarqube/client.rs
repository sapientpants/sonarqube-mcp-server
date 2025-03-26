use crate::mcp::sonarqube::types::*;
use reqwest::Client;

// Re-export SonarQubeConfig for use in other modules
pub use crate::mcp::sonarqube::types::SonarQubeConfig;
use std::sync::Arc;

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

        if !response.status().is_success() {
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
            return Err(SonarError::Api(format!("HTTP {}: {}", status, error_text)));
        }

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
        if let Some(org) = &self.organization {
            url.push_str(&format!("&organization={}", org));
        }

        // Add optional parameters if provided
        if let Some(sevs) = params.severities {
            url.push_str(&format!("&severities={}", sevs.join(",")));
        }

        if let Some(issue_types) = params.types {
            url.push_str(&format!("&types={}", issue_types.join(",")));
        }

        if let Some(issue_statuses) = params.statuses {
            url.push_str(&format!("&statuses={}", issue_statuses.join(",")));
        }

        if let Some(impact_sevs) = params.impact_severities {
            url.push_str(&format!("&impactSeverities={}", impact_sevs.join(",")));
        }

        if let Some(impact_qualities) = params.impact_software_qualities {
            url.push_str(&format!(
                "&impactSoftwareQualities={}",
                impact_qualities.join(",")
            ));
        }

        // Add new parameters
        if let Some(assigned_to_me) = params.assigned_to_me {
            url.push_str(&format!("&assignedToMe={}", assigned_to_me));
        }

        if let Some(assignees) = params.assignees {
            url.push_str(&format!("&assignees={}", assignees.join(",")));
        }

        if let Some(authors) = params.authors {
            url.push_str(&format!("&authors={}", authors.join(",")));
        }

        if let Some(code_variants) = params.code_variants {
            url.push_str(&format!("&codeVariants={}", code_variants.join(",")));
        }

        if let Some(created_after) = params.created_after {
            url.push_str(&format!("&createdAfter={}", created_after));
        }

        if let Some(created_before) = params.created_before {
            url.push_str(&format!("&createdBefore={}", created_before));
        }

        if let Some(created_in_last) = params.created_in_last {
            url.push_str(&format!("&createdInLast={}", created_in_last));
        }

        if let Some(cwe) = params.cwe {
            url.push_str(&format!("&cwe={}", cwe.join(",")));
        }

        if let Some(directories) = params.directories {
            url.push_str(&format!("&directories={}", directories.join(",")));
        }

        if let Some(facets) = params.facets {
            url.push_str(&format!("&facets={}", facets.join(",")));
        }

        if let Some(files) = params.files {
            url.push_str(&format!("&files={}", files.join(",")));
        }

        if let Some(issue_statuses) = params.issue_statuses {
            url.push_str(&format!("&issueStatuses={}", issue_statuses.join(",")));
        }

        if let Some(languages) = params.languages {
            url.push_str(&format!("&languages={}", languages.join(",")));
        }

        if let Some(owasp_top10) = params.owasp_top10 {
            url.push_str(&format!("&owaspTop10={}", owasp_top10.join(",")));
        }

        if let Some(owasp_top10_2021) = params.owasp_top10_2021 {
            url.push_str(&format!("&owaspTop10-2021={}", owasp_top10_2021.join(",")));
        }

        if let Some(resolutions) = params.resolutions {
            url.push_str(&format!("&resolutions={}", resolutions.join(",")));
        }

        if let Some(resolved) = params.resolved {
            url.push_str(&format!("&resolved={}", resolved));
        }

        if let Some(rules) = params.rules {
            url.push_str(&format!("&rules={}", rules.join(",")));
        }

        if let Some(sans_top25) = params.sans_top25 {
            url.push_str(&format!("&sansTop25={}", sans_top25.join(",")));
        }

        if let Some(sonarsource_security) = params.sonarsource_security {
            url.push_str(&format!(
                "&sonarsourceSecurity={}",
                sonarsource_security.join(",")
            ));
        }

        if let Some(tags) = params.tags {
            url.push_str(&format!("&tags={}", tags.join(",")));
        }

        if let Some(sort_field) = params.sort_field {
            url.push_str(&format!("&s={}", sort_field));
        }

        if let Some(asc) = params.asc {
            url.push_str(&format!("&asc={}", asc));
        }

        if let Some(p) = params.page {
            url.push_str(&format!("&p={}", p));
        }

        if let Some(ps) = params.page_size {
            url.push_str(&format!("&ps={}", ps));
        }

        // Log the URL for debugging if enabled
        debug_log(&format!("Making request to: {}", url));

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 401 || status.as_u16() == 403 {
                return Err(SonarError::AuthError);
            }
            if status.as_u16() == 404 {
                return Err(SonarError::ProjectNotFound(params.project_key.to_string()));
            }

            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(SonarError::Api(format!("HTTP {}: {}", status, error_text)));
        }

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

        if !response.status().is_success() {
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
            return Err(SonarError::Api(format!("HTTP {}: {}", status, error_text)));
        }

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

        if !status.is_success() {
            if status.as_u16() == 401 || status.as_u16() == 403 {
                debug_log("Authentication error");
                return Err(SonarError::AuthError);
            }

            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            debug_log(&format!("Error response: {}", error_text));
            return Err(SonarError::Api(format!("HTTP {}: {}", status, error_text)));
        }

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
