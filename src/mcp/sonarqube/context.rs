use std::sync::Arc;

use crate::mcp::McpResult;
use crate::mcp::core::context::{HasMcpContext, McpContext};
use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::config::{Config as SonarQubeFullConfig, SonarQubeConfig};
use crate::mcp::sonarqube::types::SonarQubeConfig as SonarQubeClientConfig;

/// Server context containing shared dependencies
///
/// This struct provides a central container for all server dependencies,
/// enabling proper dependency injection throughout the codebase.
/// It extends the base McpContext with SonarQube-specific functionality.
#[derive(Debug, Clone)]
pub struct ServerContext {
    /// Base MCP context
    pub mcp: McpContext,
    /// SonarQube client instance
    pub client: Arc<SonarQubeClient>,
    /// SonarQube configuration
    pub config: SonarQubeConfig,
    /// SonarQube API token
    pub api_token: String,
    /// SonarQube server URL
    pub server_url: String,
}

impl ServerContext {
    /// Create a new server context
    ///
    /// Initializes all dependencies and returns a context object that can be
    /// passed to functions that need access to these dependencies.
    ///
    /// # Arguments
    ///
    /// * `config` - Combined MCP and SonarQube configuration
    pub fn new(config: SonarQubeFullConfig) -> Self {
        let client_config = SonarQubeClientConfig {
            base_url: config.sonarqube.url.clone(),
            token: config.sonarqube.token.clone(),
            organization: config.sonarqube.organization.clone(),
        };

        let client = Arc::new(SonarQubeClient::new(client_config));

        // Clone sonarqube config to avoid borrowing after move
        let sonarqube_config = config.sonarqube.clone();
        let api_token = sonarqube_config.token.clone();
        let server_url = sonarqube_config.url.clone();

        Self {
            mcp: McpContext::new(config.mcp),
            client,
            config: sonarqube_config,
            api_token,
            server_url,
        }
    }

    /// Create a new server context with separate mcp context and SonarQube configuration
    ///
    /// # Arguments
    ///
    /// * `mcp_context` - MCP context
    /// * `sonarqube_config` - SonarQube configuration
    pub fn new_with_mcp_context(
        mcp_context: McpContext,
        sonarqube_config: SonarQubeConfig,
    ) -> Self {
        let client_config = SonarQubeClientConfig {
            base_url: sonarqube_config.url.clone(),
            token: sonarqube_config.token.clone(),
            organization: sonarqube_config.organization.clone(),
        };

        let client = Arc::new(SonarQubeClient::new(client_config));

        Self {
            mcp: mcp_context,
            client,
            config: sonarqube_config.clone(),
            api_token: sonarqube_config.token.clone(),
            server_url: sonarqube_config.url.clone(),
        }
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
        let client_config = SonarQubeClientConfig {
            base_url: base_url.clone(),
            token: token.clone(),
            organization,
        };

        let sonarqube_config = SonarQubeConfig {
            url: base_url,
            token: token.clone(),
            organization: client_config.organization.clone(),
            debug: None,
        };

        let full_config = SonarQubeFullConfig {
            mcp: crate::mcp::core::config::McpConfig::default_config(),
            sonarqube: sonarqube_config,
        };

        Ok(Self::new(full_config))
    }

    /// Get the SonarQube client
    pub fn client(&self) -> Arc<SonarQubeClient> {
        self.client.clone()
    }

    /// Get the SonarQube server URL
    pub fn get_server_url(&self) -> &str {
        &self.server_url
    }

    /// Get the SonarQube API token
    pub fn get_api_token(&self) -> &str {
        &self.api_token
    }

    /// Get the SonarQube configuration
    pub fn get_config(&self) -> &SonarQubeConfig {
        &self.config
    }

    /// Create a new server context with MCP config and SonarQube client config
    ///
    /// # Arguments
    ///
    /// * `mcp_config` - Legacy MCP server configuration
    /// * `sonarqube_client_config` - SonarQube client configuration
    #[deprecated(note = "Use ServerContext::new instead")]
    pub fn new_with_mcp_config(
        mcp_config: &crate::mcp::core::config::McpConfig,
        sonarqube_client_config: &SonarQubeClientConfig,
    ) -> McpResult<Self> {
        let mcp_context = McpContext::new(mcp_config.clone());

        let sonarqube_config = SonarQubeConfig {
            url: sonarqube_client_config.base_url.clone(),
            token: sonarqube_client_config.token.clone(),
            organization: sonarqube_client_config.organization.clone(),
            debug: Some(false), // Default to false since it's not in the client config
        };

        Ok(Self::new_with_mcp_context(mcp_context, sonarqube_config))
    }
}

// Implement HasMcpContext for ServerContext
impl HasMcpContext for ServerContext {
    fn mcp_context(&self) -> &McpContext {
        &self.mcp
    }
}
