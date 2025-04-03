//! Error Handling for the SonarQube MCP Server
//!
//! This module defines a unified error type hierarchy for the SonarQube MCP server,
//! with conversions between different error types to standardize error handling
//! throughout the codebase.

use jsonrpsee_types::ErrorObject;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{error, info, warn};

/// Standard JSON-RPC error codes defined in the specification
pub mod error_codes {
    /// Parse error: Invalid JSON was received by the server
    pub const PARSE_ERROR: i32 = -32700;
    /// Invalid Request: The JSON sent is not a valid Request object
    pub const INVALID_REQUEST: i32 = -32600;
    /// Method not found: The method does not exist / is not available
    pub const METHOD_NOT_FOUND: i32 = -32601;
    /// Invalid params: Invalid method parameter(s)
    pub const INVALID_PARAMS: i32 = -32602;
    /// Internal error: Internal JSON-RPC error
    pub const INTERNAL_ERROR: i32 = -32603;
    /// Server error: Generic server error, base for server-defined errors
    pub const SERVER_ERROR_START: i32 = -32000;
    pub const SERVER_ERROR_END: i32 = -32099;

    // Custom error codes for SonarQube MCP Server
    /// Authentication error: User is not authenticated or token is invalid
    pub const AUTH_ERROR: i32 = -33001;
    /// Configuration error: Server or tool is not properly configured
    pub const CONFIG_ERROR: i32 = -33002;
    /// Not found: Resource was not found
    pub const NOT_FOUND_ERROR: i32 = -33003;
    /// External API error: Error from an external API
    pub const EXTERNAL_API_ERROR: i32 = -33004;
}

/// The main error type for the SonarQube MCP Server
///
/// This enum provides a comprehensive set of error variants that can occur
/// throughout the application. It implements standard error traits and
/// provides conversions to and from other error types used in the codebase.
#[derive(Debug, Error)]
pub enum McpError {
    /// Invalid JSON RPC request, method, or parameters
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    /// Method not found or not implemented
    #[error("Method not found: {0}")]
    MethodNotFound(String),

    /// Authentication failure
    #[error("Authentication failed: {0}")]
    AuthError(String),

    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// Resource not found
    #[error("Not found: {0}")]
    NotFound(String),

    /// External API error (e.g., from SonarQube)
    #[error("External API error: {0}")]
    ExternalApiError(String),

    /// Database error
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// IO error
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Request error
    #[error("Request error: {0}")]
    RequestError(#[from] reqwest::Error),

    /// Serialization or deserialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// General internal error
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl McpError {
    /// Gets the error code for the error
    pub fn error_code(&self) -> i32 {
        use error_codes::*;
        match self {
            Self::InvalidRequest(_) => INVALID_REQUEST,
            Self::MethodNotFound(_) => METHOD_NOT_FOUND,
            Self::AuthError(_) => AUTH_ERROR,
            Self::ConfigError(_) => CONFIG_ERROR,
            Self::NotFound(_) => NOT_FOUND_ERROR,
            Self::ExternalApiError(_) => EXTERNAL_API_ERROR,
            Self::DatabaseError(_) => SERVER_ERROR_START,
            Self::IoError(_) => SERVER_ERROR_START + 1,
            Self::RequestError(_) => SERVER_ERROR_START + 2,
            Self::SerializationError(_) => PARSE_ERROR,
            Self::InternalError(_) => INTERNAL_ERROR,
        }
    }

    /// Convert to a JSON-RPC ErrorObject
    pub fn to_error_object(&self) -> ErrorObject<'static> {
        ErrorObject::owned(self.error_code(), self.to_string(), None::<()>)
    }

    /// Log the error with appropriate level and context
    pub fn log(&self, context: &str) {
        match self {
            // Log severe errors at error level
            Self::InternalError(msg) => {
                error!(error_type = "internal", context = context, message = %msg, "Internal server error");
            }
            Self::DatabaseError(msg) => {
                error!(error_type = "database", context = context, message = %msg, "Database error");
            }
            Self::IoError(err) => {
                error!(error_type = "io", context = context, kind = ?err.kind(), message = %err, "IO error");
            }
            Self::RequestError(err) => {
                error!(error_type = "request", context = context, url = ?err.url(), message = %err, "Request error");
            }

            // Log important but less severe errors at warn level
            Self::AuthError(msg) => {
                warn!(error_type = "auth", context = context, message = %msg, "Authentication error");
            }
            Self::ConfigError(msg) => {
                warn!(error_type = "config", context = context, message = %msg, "Configuration error");
            }
            Self::ExternalApiError(msg) => {
                warn!(error_type = "external_api", context = context, message = %msg, "External API error");
            }

            // Log expected errors at info level
            Self::NotFound(msg) => {
                info!(error_type = "not_found", context = context, message = %msg, "Resource not found");
            }
            Self::InvalidRequest(msg) => {
                info!(error_type = "invalid_request", context = context, message = %msg, "Invalid request");
            }
            Self::MethodNotFound(msg) => {
                info!(error_type = "method_not_found", context = context, message = %msg, "Method not found");
            }
            Self::SerializationError(msg) => {
                info!(error_type = "serialization", context = context, message = %msg, "Serialization error");
            }
        }
    }

    /// Helper to log an error and return it in one line
    pub fn with_log(self, context: &str) -> Self {
        self.log(context);
        self
    }
}

/// Implement conversion from JsonRPCError to McpError
impl From<ErrorObject<'_>> for McpError {
    fn from(error: ErrorObject) -> Self {
        let code = error.code();
        let message = error.message().to_string();

        use error_codes::*;
        match code {
            INVALID_REQUEST => Self::InvalidRequest(message),
            METHOD_NOT_FOUND => Self::MethodNotFound(message),
            AUTH_ERROR => Self::AuthError(message),
            CONFIG_ERROR => Self::ConfigError(message),
            NOT_FOUND_ERROR => Self::NotFound(message),
            EXTERNAL_API_ERROR => Self::ExternalApiError(message),
            PARSE_ERROR => Self::SerializationError(message),
            _ => Self::InternalError(message),
        }
    }
}

/// Implement conversion from anyhow::Error to McpError
impl From<anyhow::Error> for McpError {
    fn from(error: anyhow::Error) -> Self {
        // Try to downcast to a more specific error type
        if let Some(mcp_error) = error.downcast_ref::<McpError>() {
            return mcp_error.clone();
        }
        if let Some(sonar_error) = error.downcast_ref::<crate::mcp::sonarqube::types::SonarError>()
        {
            // Create a new instance instead of cloning
            return match sonar_error {
                crate::mcp::sonarqube::types::SonarError::Http(err) => {
                    McpError::ExternalApiError(format!("SonarQube HTTP error: {}", err))
                }
                crate::mcp::sonarqube::types::SonarError::Parse(msg) => {
                    McpError::SerializationError(msg.clone())
                }
                crate::mcp::sonarqube::types::SonarError::Api(msg) => {
                    McpError::ExternalApiError(msg.clone())
                }
                crate::mcp::sonarqube::types::SonarError::AuthError => {
                    McpError::AuthError("SonarQube authentication failed".to_string())
                }
                crate::mcp::sonarqube::types::SonarError::ProjectNotFound(key) => {
                    McpError::NotFound(format!("SonarQube project not found: {}", key))
                }
                crate::mcp::sonarqube::types::SonarError::Config(msg) => {
                    McpError::ConfigError(msg.clone())
                }
            };
        }
        if let Some(io_error) = error.downcast_ref::<std::io::Error>() {
            return McpError::IoError(std::io::Error::new(io_error.kind(), io_error.to_string()));
        }
        if let Some(reqwest_error) = error.downcast_ref::<reqwest::Error>() {
            if let Some(url) = reqwest_error.url() {
                return McpError::ExternalApiError(format!(
                    "Request to {} failed: {}",
                    url, reqwest_error
                ));
            } else {
                return McpError::ExternalApiError(format!("Request failed: {}", reqwest_error));
            }
        }
        if let Some(serde_error) = error.downcast_ref::<serde_json::Error>() {
            return McpError::SerializationError(serde_error.to_string());
        }

        // Default to InternalError
        McpError::InternalError(error.to_string())
    }
}

/// Implement conversion from SonarError to McpError
impl From<crate::mcp::sonarqube::types::SonarError> for McpError {
    fn from(error: crate::mcp::sonarqube::types::SonarError) -> Self {
        match error {
            crate::mcp::sonarqube::types::SonarError::Http(err) => Self::RequestError(err),
            crate::mcp::sonarqube::types::SonarError::Parse(msg) => Self::SerializationError(msg),
            crate::mcp::sonarqube::types::SonarError::Api(msg) => Self::ExternalApiError(msg),
            crate::mcp::sonarqube::types::SonarError::AuthError => {
                Self::AuthError("SonarQube authentication failed".to_string())
            }
            crate::mcp::sonarqube::types::SonarError::ProjectNotFound(key) => {
                Self::NotFound(format!("SonarQube project not found: {}", key))
            }
            crate::mcp::sonarqube::types::SonarError::Config(msg) => Self::ConfigError(msg),
        }
    }
}

// Allow cloning for use in the anyhow::Error conversion
impl Clone for McpError {
    fn clone(&self) -> Self {
        match self {
            Self::InvalidRequest(msg) => Self::InvalidRequest(msg.clone()),
            Self::MethodNotFound(msg) => Self::MethodNotFound(msg.clone()),
            Self::AuthError(msg) => Self::AuthError(msg.clone()),
            Self::ConfigError(msg) => Self::ConfigError(msg.clone()),
            Self::NotFound(msg) => Self::NotFound(msg.clone()),
            Self::ExternalApiError(msg) => Self::ExternalApiError(msg.clone()),
            Self::DatabaseError(msg) => Self::DatabaseError(msg.clone()),
            Self::IoError(err) => Self::IoError(std::io::Error::new(err.kind(), err.to_string())),
            Self::RequestError(err) => {
                // Since reqwest::Error doesn't implement Clone, convert to ExternalApiError with details
                if let Some(url) = err.url() {
                    Self::ExternalApiError(format!("Request to {} failed: {}", url, err))
                } else {
                    Self::ExternalApiError(format!("Request failed: {}", err))
                }
            }
            Self::SerializationError(msg) => Self::SerializationError(msg.clone()),
            Self::InternalError(msg) => Self::InternalError(msg.clone()),
        }
    }
}

/// Serializable error response for the API
///
/// This is a simpler error representation that can be safely
/// serialized and returned to API clients.
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    /// Error code
    pub code: i32,
    /// Error message
    pub message: String,
    /// Optional additional details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl From<McpError> for ApiError {
    fn from(error: McpError) -> Self {
        Self {
            code: error.error_code(),
            message: error.to_string(),
            details: None,
        }
    }
}

/// Type alias for a Result with McpError as the error type
pub type McpResult<T> = Result<T, McpError>;

/// Helper function to map anyhow::Result to McpResult
pub fn map_anyhow_err<T>(result: anyhow::Result<T>, context: &str) -> McpResult<T> {
    result.map_err(|e| {
        let mcp_error = McpError::from(e);
        mcp_error.log(context);
        mcp_error
    })
}

/// Helper function to log and convert from SonarError to McpResult
pub fn from_sonar_err<T>(
    result: Result<T, crate::mcp::sonarqube::types::SonarError>,
    context: &str,
) -> McpResult<T> {
    result.map_err(|e| {
        let mcp_error = McpError::from(e);
        mcp_error.log(context);
        mcp_error
    })
}

/// Helper trait to extend Result with logging capabilities
pub trait ResultExt<T> {
    /// Log an error with context if the result is an Err
    fn log_err(self, context: &str) -> Self;
}

impl<T> ResultExt<T> for McpResult<T> {
    fn log_err(self, context: &str) -> Self {
        if let Err(ref e) = self {
            e.log(context);
        }
        self
    }
}
