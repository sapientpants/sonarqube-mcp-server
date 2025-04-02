use std::sync::Arc;

use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::types::SonarQubeConfig;

/// Server context containing shared dependencies
///
/// This struct provides a central container for all server dependencies,
/// enabling proper dependency injection throughout the codebase.
/// It replaces the use of global state like static variables.
#[derive(Clone)]
pub struct ServerContext {
    /// SonarQube client instance
    pub client: Arc<SonarQubeClient>,
    /// SonarQube configuration
    pub config: SonarQubeConfig,
}

impl ServerContext {
    /// Create a new server context
    ///
    /// Initializes all dependencies and returns a context object that can be
    /// passed to functions that need access to these dependencies.
    ///
    /// # Arguments
    ///
    /// * `config` - SonarQube configuration including URL, token, and organization
    pub fn new(config: SonarQubeConfig) -> Self {
        let client = Arc::new(SonarQubeClient::new(config.clone()));
        Self { client, config }
    }

    /// Create a new context from environment variables
    ///
    /// This is a convenience method that creates a context by reading
    /// required configuration from environment variables.
    ///
    /// # Returns
    ///
    /// Returns a Result containing the context on success, or an error if
    /// required environment variables are missing.
    pub fn from_env() -> Result<Self, crate::mcp::sonarqube::types::SonarError> {
        use crate::mcp::sonarqube::tools::{
            SONARQUBE_ORGANIZATION_ENV, SONARQUBE_TOKEN_ENV, SONARQUBE_URL_ENV,
        };

        // Get environment variables
        let base_url = std::env::var(SONARQUBE_URL_ENV).map_err(|_| {
            crate::mcp::sonarqube::types::SonarError::Config(
                "SONARQUBE_URL environment variable not set".to_string(),
            )
        })?;

        let token = std::env::var(SONARQUBE_TOKEN_ENV).map_err(|_| {
            crate::mcp::sonarqube::types::SonarError::Config(
                "SONARQUBE_TOKEN environment variable not set".to_string(),
            )
        })?;

        // Get optional organization
        let organization = std::env::var(SONARQUBE_ORGANIZATION_ENV).ok();

        // Create config
        let config = SonarQubeConfig {
            base_url,
            token,
            organization,
        };

        Ok(Self::new(config))
    }

    /// Get the SonarQube client
    pub fn client(&self) -> Arc<SonarQubeClient> {
        self.client.clone()
    }
}
