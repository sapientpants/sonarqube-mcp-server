/// # SonarQube Configuration
///
/// This module defines the SonarQube-specific configuration for the MCP server.
use crate::mcp::core::config::{ConfigError, McpConfig};
use crate::mcp::core::errors::McpResult;
use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::types::SonarQubeConfig as SonarQubeClientConfig;
use anyhow::Result;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::sync::Mutex;

// Environment variables for SonarQube configuration
pub const SONARQUBE_URL_ENV: &str = "SONARQUBE_URL";
pub const SONARQUBE_TOKEN_ENV: &str = "SONARQUBE_TOKEN";
pub const SONARQUBE_ORGANIZATION_ENV: &str = "SONARQUBE_ORGANIZATION";
pub const SONARQUBE_DEBUG_ENV: &str = "SONARQUBE_DEBUG";

// Constants for configuration sources
pub const ENV_CONFIG_FILE: &str = "SONARQUBE_MCP_CONFIG";
pub const DEFAULT_CONFIG_FILENAME: &str = "sonarqube-mcp.toml";

/// SonarQube server configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeConfig {
    /// The base URL of the SonarQube server
    pub url: String,

    /// Authentication token for accessing the SonarQube API
    pub token: String,

    /// Optional organization key for SonarCloud or multi-organization instances
    pub organization: Option<String>,

    /// Debug mode for additional logging
    pub debug: Option<bool>,
}

/// Combined configuration structure
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    /// Base MCP configuration
    #[serde(flatten)]
    pub mcp: McpConfig,

    /// SonarQube integration configuration
    pub sonarqube: SonarQubeConfig,
}

impl Config {
    /// Create a default configuration
    pub fn default_config() -> Self {
        Self {
            mcp: McpConfig::default_config(),
            sonarqube: SonarQubeConfig {
                url: String::new(),
                token: String::new(),
                organization: None,
                debug: None,
            },
        }
    }

    /// Load configuration from a specific file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, ConfigError> {
        let content = fs::read_to_string(path.as_ref()).map_err(|e| {
            ConfigError::FileReadError(format!(
                "Failed to read config file {}: {}",
                path.as_ref().display(),
                e
            ))
        })?;

        let config: Self = toml::from_str(&content).map_err(|e| {
            ConfigError::ParseError(format!(
                "Failed to parse config file {}: {}",
                path.as_ref().display(),
                e
            ))
        })?;

        Ok(config)
    }

    /// Apply environment variables to the configuration
    pub fn apply_env_vars(mut config: Self) -> McpResult<Self> {
        // Apply MCP environment variables
        // (MCP core configuration module will need to expose this as a public function)

        // SonarQube configuration
        if let Ok(url) = env::var(SONARQUBE_URL_ENV) {
            config.sonarqube.url = url;
        }

        if let Ok(token) = env::var(SONARQUBE_TOKEN_ENV) {
            config.sonarqube.token = token;
        }

        if let Ok(org) = env::var(SONARQUBE_ORGANIZATION_ENV) {
            config.sonarqube.organization = Some(org);
        }

        if let Ok(debug) = env::var(SONARQUBE_DEBUG_ENV) {
            config.sonarqube.debug = Some(Self::parse_bool_env(SONARQUBE_DEBUG_ENV, &debug)?);
        }

        Ok(config)
    }

    /// Parse a boolean environment variable
    fn parse_bool_env(name: &str, value: &str) -> Result<bool, ConfigError> {
        match value.to_lowercase().as_str() {
            "true" | "1" | "yes" | "on" => Ok(true),
            "false" | "0" | "no" | "off" => Ok(false),
            _ => Err(ConfigError::InvalidValue(
                name.to_string(),
                format!("Invalid boolean value: {}", value),
            )),
        }
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), ConfigError> {
        // Validate MCP configuration
        self.mcp.validate()?;

        // Validate SonarQube configuration
        if self.sonarqube.url.is_empty() {
            return Err(ConfigError::MissingValue(
                "SonarQube URL is required".to_string(),
            ));
        }

        if self.sonarqube.token.is_empty() {
            return Err(ConfigError::MissingValue(
                "SonarQube token is required".to_string(),
            ));
        }

        Ok(())
    }

    /// Save the configuration to a file
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<(), ConfigError> {
        let content = toml::to_string_pretty(self).map_err(|e| {
            ConfigError::General(format!("Failed to serialize configuration: {}", e))
        })?;

        fs::write(path.as_ref(), content).map_err(|e| {
            ConfigError::FileReadError(format!(
                "Failed to write config file {}: {}",
                path.as_ref().display(),
                e
            ))
        })?;

        Ok(())
    }

    /// Converts this configuration to a SonarQube client configuration
    pub fn to_sonarqube_client_config(&self) -> SonarQubeClientConfig {
        SonarQubeClientConfig {
            base_url: self.sonarqube.url.clone(),
            token: self.sonarqube.token.clone(),
            organization: self.sonarqube.organization.clone(),
        }
    }
}

/// Global SonarQube client for tools to use (deprecated)
///
/// This global variable provides a singleton instance of the SonarQube client
/// that can be accessed by all tools. It's initialized during server startup.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should use the ServerContext for dependency injection instead.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext for dependency injection instead of global state"
)]
pub static SONARQUBE_CLIENT: Mutex<OnceCell<Arc<SonarQubeClient>>> = Mutex::new(OnceCell::new());

/// Error type from the SonarQube client
pub use crate::mcp::sonarqube::types::SonarError;

/// Initialize the SonarQube client (deprecated)
///
/// This function creates and initializes a SonarQube client instance using
/// environment variables. It sets up the client with the SonarQube server URL,
/// authentication token, and optional organization.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should use the ServerContext.from_env() method instead.
///
/// # Returns
///
/// A result indicating success or error. An error is returned if required
/// environment variables are missing or the client cannot be initialized.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext::from_env() instead of this function for dependency injection"
)]
#[allow(dead_code)]
pub fn init_sonarqube_client() -> Result<(), SonarError> {
    // Get environment variables
    let base_url = std::env::var(SONARQUBE_URL_ENV).map_err(|_| {
        SonarError::Config("SONARQUBE_URL environment variable not set".to_string())
    })?;

    let token = std::env::var(SONARQUBE_TOKEN_ENV).map_err(|_| {
        SonarError::Config("SONARQUBE_TOKEN environment variable not set".to_string())
    })?;

    // Get optional organization
    let organization = std::env::var(SONARQUBE_ORGANIZATION_ENV).ok();

    // Create config
    let client_config = SonarQubeClientConfig {
        base_url,
        token,
        organization,
    };

    // Create client
    let client = SonarQubeClient::new(client_config);

    // Store client in global variable
    #[allow(deprecated)]
    SONARQUBE_CLIENT
        .lock()
        .unwrap()
        .set(Arc::new(client))
        .map_err(|_| SonarError::Config("Failed to set SonarQube client".to_string()))?;

    Ok(())
}

/// Get the SonarQube client instance (deprecated)
///
/// This function retrieves the global SonarQube client instance.
/// It should be called after the client has been initialized.
///
/// Note: This is deprecated and maintained only for backward compatibility.
/// New code should use the ServerContext for dependency injection instead.
///
/// # Returns
///
/// A result containing a reference to the SonarQube client on success,
/// or an error if the client has not been initialized.
#[deprecated(
    since = "0.3.0",
    note = "Use ServerContext for dependency injection instead of global state"
)]
pub fn get_client() -> Result<Arc<SonarQubeClient>, SonarError> {
    #[allow(deprecated)]
    SONARQUBE_CLIENT
        .lock()
        .unwrap()
        .get()
        .cloned()
        .ok_or_else(|| SonarError::Config(
            "SonarQube client not initialized. Make sure SONARQUBE_URL and SONARQUBE_TOKEN environment variables are set.".to_string()
        ))
}

/// Reset the SonarQube client (for testing)
///
/// This function resets the global SonarQube client, ensuring that it
/// will be reinitialized the next time it's accessed.
#[doc(hidden)]
pub fn reset_client() {
    #[allow(deprecated)]
    let _ = SONARQUBE_CLIENT.lock().unwrap().take();
}

/// Test utilities for SonarQube configuration
#[cfg(test)]
pub mod test_utils {
    use super::*;

    /// Reset the SonarQube client for testing
    ///
    /// This function resets the global SonarQube client, ensuring that it
    /// will be reinitialized the next time it's accessed. It's specifically
    /// designed for use in tests to prevent state leakage between tests.
    pub fn reset_sonarqube_client() {
        reset_client();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_default_config() {
        let config = Config::default_config();
        assert!(config.sonarqube.url.is_empty());
        assert!(config.sonarqube.token.is_empty());
        assert_eq!(config.sonarqube.organization, None);
        assert_eq!(config.mcp.server.host, "127.0.0.1");
        assert_eq!(config.mcp.server.port, 9000);
    }

    #[test]
    fn test_parse_bool_env() {
        // Test valid boolean values
        assert!(Config::parse_bool_env("TEST", "true").unwrap());
        assert!(Config::parse_bool_env("TEST", "1").unwrap());
        assert!(Config::parse_bool_env("TEST", "yes").unwrap());
        assert!(Config::parse_bool_env("TEST", "on").unwrap());

        assert!(!Config::parse_bool_env("TEST", "false").unwrap());
        assert!(!Config::parse_bool_env("TEST", "0").unwrap());
        assert!(!Config::parse_bool_env("TEST", "no").unwrap());
        assert!(!Config::parse_bool_env("TEST", "off").unwrap());

        // Test case insensitivity
        assert!(Config::parse_bool_env("TEST", "TRUE").unwrap());
        assert!(!Config::parse_bool_env("TEST", "FALSE").unwrap());

        // Test invalid values
        assert!(Config::parse_bool_env("TEST", "invalid").is_err());
    }

    #[test]
    fn test_save_and_load_config() {
        let dir = tempdir().unwrap();
        let config_path = dir.path().join("test-config.toml");

        // Create a sample configuration
        let config = Config {
            mcp: McpConfig::default(),
            sonarqube: SonarQubeConfig {
                url: "https://sonarqube.example.com".to_string(),
                token: "test-token".to_string(),
                organization: Some("test-org".to_string()),
                debug: Some(true),
            },
        };

        // Save it to a file
        config.save_to_file(&config_path).unwrap();

        // Load it back
        let loaded_config = Config::load_from_file(&config_path).unwrap();

        // Verify it matches the original
        assert_eq!(loaded_config.sonarqube.url, config.sonarqube.url);
        assert_eq!(loaded_config.sonarqube.token, config.sonarqube.token);
        assert_eq!(
            loaded_config.sonarqube.organization,
            config.sonarqube.organization
        );
        assert_eq!(loaded_config.sonarqube.debug, config.sonarqube.debug);
    }
}
