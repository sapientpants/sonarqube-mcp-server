use crate::mcp::sonarqube::types::*;
use reqwest::Client;

// Re-export SonarQubeConfig for use in other modules
pub use crate::mcp::sonarqube::types::SonarQubeConfig;
use std::sync::Arc;

/// Local debug logging helper
fn debug_log(message: &str) {
    if let Ok(value) = std::env::var("SONARQUBE_DEBUG") {
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
        project_key: &str,
        severities: Option<&[&str]>,
        types: Option<&[&str]>,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> Result<IssuesResponse, SonarError> {
        let mut url = format!(
            "{}/api/issues/search?componentKeys={}",
            self.base_url, project_key
        );

        // Add organization parameter if available
        if let Some(org) = &self.organization {
            url.push_str(&format!("&organization={}", org));
        }

        // Add optional parameters if provided
        if let Some(sevs) = severities {
            url.push_str(&format!("&severities={}", sevs.join(",")));
        }

        if let Some(issue_types) = types {
            url.push_str(&format!("&types={}", issue_types.join(",")));
        }

        if let Some(p) = page {
            url.push_str(&format!("&p={}", p));
        }

        if let Some(ps) = page_size {
            url.push_str(&format!("&ps={}", ps));
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

/// Create a shared instance of SonarQubeClient
pub fn create_client(config: SonarQubeConfig) -> Arc<SonarQubeClient> {
    Arc::new(SonarQubeClient::new(config))
}
