use crate::mcp::sonarqube::types::*;
use reqwest::Client;

// Re-export SonarQubeConfig for use in other modules
pub use crate::mcp::sonarqube::types::SonarQubeConfig;
use std::sync::Arc;

/// SonarQube API client
pub struct SonarQubeClient {
    /// HTTP client for making requests
    client: Client,
    /// Base URL of the SonarQube server
    base_url: String,
    /// Authentication token for SonarQube API
    token: String,
}

impl SonarQubeClient {
    /// Create a new SonarQube client with the given configuration
    pub fn new(config: SonarQubeConfig) -> Self {
        Self {
            client: Client::new(),
            base_url: config.base_url,
            token: config.token,
        }
    }

    /// Get metrics for a project
    pub async fn get_metrics(
        &self,
        project_key: &str,
        metrics: &[&str],
    ) -> Result<MetricsResponse, SonarError> {
        let metrics_str = metrics.join(",");
        let url = format!(
            "{}/api/measures/component?component={}&metricKeys={}",
            self.base_url, project_key, metrics_str
        );

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

        let data = response.json::<MetricsResponse>().await?;
        Ok(data)
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

        let data = response.json::<IssuesResponse>().await?;
        Ok(data)
    }

    /// Get quality gate status for a project
    pub async fn get_quality_gate(
        &self,
        project_key: &str,
    ) -> Result<QualityGateResponse, SonarError> {
        let url = format!(
            "{}/api/qualitygates/project_status?projectKey={}",
            self.base_url, project_key
        );

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

        let data = response.json::<QualityGateResponse>().await?;
        Ok(data)
    }
}

/// Create a shared instance of SonarQubeClient
pub fn create_client(config: SonarQubeConfig) -> Arc<SonarQubeClient> {
    Arc::new(SonarQubeClient::new(config))
}
