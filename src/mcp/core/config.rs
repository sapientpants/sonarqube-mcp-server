//! # Core MCP Configuration
//!
//! This module defines the core configuration for the MCP server,
//! separate from tool-specific configurations.

use crate::mcp::core::errors::McpError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use thiserror::Error;
use tracing::error;

// Constants for configuration sources
pub const ENV_CONFIG_FILE: &str = "MCP_CONFIG";
pub const DEFAULT_CONFIG_FILENAME: &str = "mcp-server.toml";

/// Configuration error types
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Failed to read configuration file: {0}")]
    FileReadError(String),

    #[error("Failed to parse configuration file: {0}")]
    ParseError(String),

    #[error("Missing required configuration value: {0}")]
    MissingValue(String),

    #[error("Invalid configuration value for {0}: {1}")]
    InvalidValue(String, String),

    #[error("Configuration error: {0}")]
    General(String),
}

impl From<ConfigError> for McpError {
    fn from(err: ConfigError) -> Self {
        McpError::ConfigError(err.to_string())
    }
}

/// Server configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ServerConfig {
    /// Host address to bind the server to
    #[serde(default = "default_host")]
    pub host: String,

    /// Port to listen on
    #[serde(default = "default_port")]
    pub port: u16,

    /// Maximum number of concurrent connections
    #[serde(default = "default_max_connections")]
    pub max_connections: usize,

    /// Request timeout in seconds
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
}

fn default_host() -> String {
    "127.0.0.1".to_string()
}

fn default_port() -> u16 {
    9000
}

fn default_max_connections() -> usize {
    100
}

fn default_timeout() -> u64 {
    30
}

/// Logging configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LoggingConfig {
    /// Log level (error, warn, info, debug, trace)
    #[serde(default = "default_log_level")]
    pub level: String,

    /// Log file path (optional)
    pub file: Option<String>,

    /// Whether to log to stdout
    #[serde(default = "default_log_stdout")]
    pub stdout: bool,

    /// Whether to use JSON format for logs
    #[serde(default = "default_log_json")]
    pub json_format: bool,
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_log_stdout() -> bool {
    true
}

fn default_log_json() -> bool {
    false
}

/// Core MCP configuration structure
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct McpConfig {
    /// Server name
    #[serde(default = "default_server_name")]
    pub server_name: String,

    /// Server configuration
    #[serde(default)]
    pub server: ServerConfig,

    /// Logging configuration
    #[serde(default)]
    pub logging: LoggingConfig,
}

fn default_server_name() -> String {
    "MCP Server".to_string()
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
            max_connections: default_max_connections(),
            timeout_seconds: default_timeout(),
        }
    }
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: default_log_level(),
            file: None,
            stdout: default_log_stdout(),
            json_format: default_log_json(),
        }
    }
}

impl Default for McpConfig {
    fn default() -> Self {
        Self {
            server_name: default_server_name(),
            server: ServerConfig::default(),
            logging: LoggingConfig::default(),
        }
    }
}

impl McpConfig {
    /// Create a default configuration
    pub fn default_config() -> Self {
        Self::default()
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

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), ConfigError> {
        // Validate server configuration
        if self.server.port == 0 {
            return Err(ConfigError::InvalidValue(
                "server.port".to_string(),
                "Port cannot be 0".to_string(),
            ));
        }

        // Validate logging configuration
        match self.logging.level.to_lowercase().as_str() {
            "error" | "warn" | "info" | "debug" | "trace" => {} // Valid log levels
            _ => {
                return Err(ConfigError::InvalidValue(
                    "logging.level".to_string(),
                    format!("Invalid log level: {}", self.logging.level),
                ));
            }
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_default_config() {
        let config = McpConfig::default_config();
        assert_eq!(config.server_name, "MCP Server");
        assert_eq!(config.server.host, "127.0.0.1");
        assert_eq!(config.server.port, 9000);
    }

    #[test]
    fn test_save_and_load_config() {
        let dir = tempdir().unwrap();
        let config_path = dir.path().join("test-config.toml");

        // Create a sample configuration
        let config = McpConfig {
            server_name: "Test MCP Server".to_string(),
            server: ServerConfig::default(),
            logging: LoggingConfig::default(),
        };

        // Save it to a file
        config.save_to_file(&config_path).unwrap();

        // Load it back
        let loaded_config = McpConfig::load_from_file(&config_path).unwrap();

        // Verify it matches the original
        assert_eq!(loaded_config.server_name, config.server_name);
        assert_eq!(loaded_config.server.host, config.server.host);
        assert_eq!(loaded_config.server.port, config.server.port);
    }
}
