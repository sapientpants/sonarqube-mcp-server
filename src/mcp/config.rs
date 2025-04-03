//! # Configuration Management Module
//!
//! This module provides a centralized configuration system for the SonarQube MCP server.
//! It supports loading configuration from multiple sources (environment variables,
//! command-line arguments, and configuration files) with validation.

use crate::mcp::core::errors::{McpError, McpResult};
use crate::server::Args;
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;
use tracing::{debug, error};

// Constants for configuration sources
pub const ENV_CONFIG_FILE: &str = "SONARQUBE_MCP_CONFIG";
pub const DEFAULT_CONFIG_FILENAME: &str = "sonarqube-mcp.toml";

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

/// Main configuration structure
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    /// SonarQube integration configuration
    pub sonarqube: SonarQubeConfig,

    /// Server configuration
    #[serde(default)]
    pub server: ServerConfig,

    /// Logging configuration
    #[serde(default)]
    pub logging: LoggingConfig,

    /// Additional custom configuration key-value pairs
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom: Option<HashMap<String, serde_json::Value>>,
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

impl Config {
    /// Load configuration from all available sources
    ///
    /// Loads configuration in the following order of precedence (highest to lowest):
    /// 1. Command-line arguments
    /// 2. Environment variables
    /// 3. Configuration file specified by ENV_CONFIG_FILE environment variable
    /// 4. Configuration file in the current directory
    /// 5. Configuration file in the user's home directory
    ///
    /// # Returns
    ///
    /// A result containing the loaded configuration or an error
    pub fn load() -> McpResult<Self> {
        // Start with default configuration
        let mut config = Self::default_config();

        // Try to load from configuration files
        if let Some(config_from_file) = Self::load_from_config_files()? {
            config = config_from_file;
        }

        // Apply environment variables
        config = Self::apply_env_vars(config)?;

        // Apply command line arguments if available
        if let Some(args) = Self::parse_args() {
            config = Self::apply_args(config, &args)?;
        }

        // Validate the configuration
        config.validate()?;

        Ok(config)
    }

    /// Load configuration with explicitly provided command-line arguments
    ///
    /// This is useful for testing or when arguments are parsed elsewhere.
    ///
    /// # Arguments
    ///
    /// * `args` - Command-line arguments
    ///
    /// # Returns
    ///
    /// A result containing the loaded configuration or an error
    pub fn load_with_args(args: &Args) -> McpResult<Self> {
        // Start with default configuration
        let mut config = Self::default_config();

        // Try to load from configuration files
        if let Some(config_from_file) = Self::load_from_config_files()? {
            config = config_from_file;
        }

        // Apply environment variables
        config = Self::apply_env_vars(config)?;

        // Apply provided command line arguments
        config = Self::apply_args(config, args)?;

        // Validate the configuration
        config.validate()?;

        Ok(config)
    }

    /// Create a default configuration
    pub fn default_config() -> Self {
        Self {
            sonarqube: SonarQubeConfig {
                url: String::new(),
                token: String::new(),
                organization: None,
                debug: None,
            },
            server: ServerConfig::default(),
            logging: LoggingConfig::default(),
            custom: None,
        }
    }

    /// Parse command-line arguments
    fn parse_args() -> Option<Args> {
        // Try to parse args but handle errors gracefully
        match std::panic::catch_unwind(Args::parse) {
            Ok(args) => Some(args),
            Err(_) => None,
        }
    }

    /// Apply command-line arguments to the configuration
    fn apply_args(mut config: Self, args: &Args) -> McpResult<Self> {
        // Apply SonarQube configuration from args
        config.sonarqube.url = args.sonarqube_url.clone();
        config.sonarqube.token = args.sonarqube_token.clone();

        if let Some(org) = &args.sonarqube_organization {
            config.sonarqube.organization = Some(org.clone());
        }

        Ok(config)
    }

    /// Apply environment variables to the configuration
    pub fn apply_env_vars(mut config: Self) -> McpResult<Self> {
        // SonarQube configuration
        if let Ok(url) = env::var("SONARQUBE_URL") {
            config.sonarqube.url = url;
        }

        if let Ok(token) = env::var("SONARQUBE_TOKEN") {
            config.sonarqube.token = token;
        }

        if let Ok(org) = env::var("SONARQUBE_ORGANIZATION") {
            config.sonarqube.organization = Some(org);
        }

        if let Ok(debug) = env::var("SONARQUBE_DEBUG") {
            config.sonarqube.debug = Some(Self::parse_bool_env("SONARQUBE_DEBUG", &debug)?);
        }

        // Server configuration
        if let Ok(host) = env::var("SONARQUBE_MCP_HOST") {
            config.server.host = host;
        }

        if let Ok(port) = env::var("SONARQUBE_MCP_PORT") {
            config.server.port = Self::parse_number_env("SONARQUBE_MCP_PORT", &port)?;
        }

        if let Ok(max_conn) = env::var("SONARQUBE_MCP_MAX_CONNECTIONS") {
            config.server.max_connections =
                Self::parse_number_env("SONARQUBE_MCP_MAX_CONNECTIONS", &max_conn)?;
        }

        if let Ok(timeout) = env::var("SONARQUBE_MCP_TIMEOUT") {
            config.server.timeout_seconds =
                Self::parse_number_env("SONARQUBE_MCP_TIMEOUT", &timeout)?;
        }

        // Logging configuration
        if let Ok(level) = env::var("SONARQUBE_MCP_LOG_LEVEL") {
            config.logging.level = level;
        }

        if let Ok(file) = env::var("SONARQUBE_MCP_LOG_FILE") {
            config.logging.file = Some(file);
        }

        if let Ok(stdout) = env::var("SONARQUBE_MCP_LOG_STDOUT") {
            config.logging.stdout = Self::parse_bool_env("SONARQUBE_MCP_LOG_STDOUT", &stdout)?;
        }

        if let Ok(json) = env::var("SONARQUBE_MCP_LOG_JSON") {
            config.logging.json_format = Self::parse_bool_env("SONARQUBE_MCP_LOG_JSON", &json)?;
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

    /// Parse a numeric environment variable
    fn parse_number_env<T>(name: &str, value: &str) -> Result<T, ConfigError>
    where
        T: std::str::FromStr,
        <T as std::str::FromStr>::Err: std::fmt::Display,
    {
        value.parse::<T>().map_err(|e| {
            ConfigError::InvalidValue(
                name.to_string(),
                format!("Invalid numeric value: {} ({})", value, e),
            )
        })
    }

    /// Load configuration from available configuration files
    fn load_from_config_files() -> McpResult<Option<Self>> {
        // Try loading from the path specified in the environment variable
        if let Ok(config_path) = env::var(ENV_CONFIG_FILE) {
            let path = PathBuf::from(config_path);
            if path.exists() {
                debug!("Loading configuration from {}", path.display());
                return Ok(Some(Self::load_from_file(&path)?));
            }
        }

        // Try loading from the current directory
        let current_dir_config = PathBuf::from(DEFAULT_CONFIG_FILENAME);
        if current_dir_config.exists() {
            debug!(
                "Loading configuration from current directory: {}",
                current_dir_config.display()
            );
            return Ok(Some(Self::load_from_file(&current_dir_config)?));
        }

        // Try loading from the user's home directory
        if let Some(home_dir) = dirs::home_dir() {
            let home_config = home_dir.join(DEFAULT_CONFIG_FILENAME);
            if home_config.exists() {
                debug!(
                    "Loading configuration from home directory: {}",
                    home_config.display()
                );
                return Ok(Some(Self::load_from_file(&home_config)?));
            }
        }

        Ok(None)
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

    /// Converts this configuration to a SonarQube client configuration
    pub fn to_sonarqube_config(&self) -> crate::mcp::sonarqube::types::SonarQubeConfig {
        crate::mcp::sonarqube::types::SonarQubeConfig {
            base_url: self.sonarqube.url.clone(),
            token: self.sonarqube.token.clone(),
            organization: self.sonarqube.organization.clone(),
        }
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
        assert_eq!(config.server.host, "127.0.0.1");
        assert_eq!(config.server.port, 9000);
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
    fn test_parse_number_env() {
        // Test valid numeric values
        assert_eq!(Config::parse_number_env::<u16>("TEST", "123").unwrap(), 123);
        assert_eq!(
            Config::parse_number_env::<i32>("TEST", "-456").unwrap(),
            -456
        );

        // Test invalid values
        assert!(Config::parse_number_env::<u16>("TEST", "invalid").is_err());
        assert!(Config::parse_number_env::<u16>("TEST", "-123").is_err()); // Negative for unsigned
    }

    #[test]
    fn test_save_and_load_config() {
        let dir = tempdir().unwrap();
        let config_path = dir.path().join("test-config.toml");

        // Create a sample configuration
        let config = Config {
            sonarqube: SonarQubeConfig {
                url: "https://sonarqube.example.com".to_string(),
                token: "test-token".to_string(),
                organization: Some("test-org".to_string()),
                debug: Some(true),
            },
            server: ServerConfig::default(),
            logging: LoggingConfig::default(),
            custom: None,
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
