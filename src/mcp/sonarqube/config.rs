/// Configuration utilities for SonarQube integration.
///
/// This module provides configuration constants and helpers for the SonarQube integration.

// Static constants for environment variable names

/// SonarQube server URL environment variable
///
/// This environment variable should be set to the base URL of the SonarQube server
/// that the client will connect to (e.g., "https://sonarqube.example.com").
pub static SONARQUBE_URL_ENV: &str = "SONARQUBE_URL";

/// SonarQube authentication token environment variable
///
/// This environment variable should be set to a valid authentication token
/// that grants access to the SonarQube API.
pub static SONARQUBE_TOKEN_ENV: &str = "SONARQUBE_TOKEN";

/// SonarQube organization identifier environment variable (optional)
///
/// This optional environment variable can be set to specify a SonarQube organization
/// when using SonarCloud or a multi-organization SonarQube instance.
pub static SONARQUBE_ORGANIZATION_ENV: &str = "SONARQUBE_ORGANIZATION";

/// SonarQube debug mode environment variable (optional)
///
/// When set to a truthy value, enables additional debug logging for
/// SonarQube client operations.
pub static SONARQUBE_DEBUG_ENV: &str = "SONARQUBE_DEBUG";

use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::types::{SonarError, SonarQubeConfig};
use anyhow::Result;
use once_cell::sync::OnceCell;
use std::sync::Arc;
use std::sync::Mutex;

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
    let config = SonarQubeConfig {
        base_url,
        token,
        organization,
    };

    // Create client
    let client = SonarQubeClient::new(config);

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
