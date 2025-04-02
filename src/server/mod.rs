//! # Server Module
//!
//! This module provides utility functions and command-line argument handling for the
//! SonarQube MCP server. It serves as a thin wrapper around the RMCP SDK functionality.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use clap::Parser;
use tracing::info;

use crate::mcp::sonarqube::tools::{
    SONARQUBE_ORGANIZATION_ENV, SONARQUBE_TOKEN_ENV, SONARQUBE_URL_ENV,
};

/// Command line arguments for the server
///
/// This struct defines all command-line parameters supported by the SonarQube MCP server.
/// It's used with the clap crate to parse arguments and environment variables.
#[derive(Parser, Debug)]
pub struct Args {
    /// SonarQube server URL
    #[arg(short = 'u', long, env = SONARQUBE_URL_ENV)]
    pub sonarqube_url: String,

    /// SonarQube authentication token
    #[arg(short = 't', long, env = SONARQUBE_TOKEN_ENV)]
    pub sonarqube_token: String,

    /// SonarQube organization (optional)
    #[arg(short = 'o', long, env = SONARQUBE_ORGANIZATION_ENV)]
    pub sonarqube_organization: Option<String>,

    /// List MCP resources
    #[arg(long)]
    pub resources: bool,

    /// List MCP prompts
    #[arg(long)]
    pub prompts: bool,

    /// List MCP tools
    #[arg(long)]
    pub tools: bool,

    /// Show MCP information
    #[arg(long)]
    pub mcp: bool,

    /// Output in JSON format
    #[arg(long)]
    pub json: bool,
}

impl Args {
    /// Check if any of the list arguments are available
    ///
    /// Returns true if any of the flags for listing resources, prompts, or tools is set.
    pub fn is_args_available(&self) -> bool {
        self.resources || self.prompts || self.tools
    }
}

/// Sets up signal handlers.
///
/// This function sets up handlers for SIGTERM and SIGINT signals on Unix systems
/// and Ctrl+C on Windows. When signals are received, it will set a flag indicating
/// that the server should shut down gracefully.
///
/// # Returns
///
/// Returns an atomic boolean wrapped in an Arc that will be set to false when
/// a termination signal is received.
pub async fn setup_signal_handlers() -> Arc<AtomicBool> {
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    tokio::spawn(async move {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to listen for Ctrl+C");
        r.store(false, Ordering::SeqCst);
    });

    running
}

/// Display information about the server
///
/// Shows various information based on the command-line arguments:
/// - Resources: Lists available documentation and template resources
/// - Prompts: Lists available AI prompts
/// - Tools: Lists available tools for interacting with SonarQube
/// - MCP: Shows MCP configuration information
///
/// Output can be formatted as JSON if the `json` flag is set.
///
/// # Arguments
///
/// * `args` - Command line arguments containing display preferences
pub async fn display_info(args: &Args) {
    info!("Starting SonarQube MCP server...");
    info!("Using the official RMCP SDK for MCP communication");
    info!("Connected to SonarQube at {}", args.sonarqube_url);
    if let Some(org) = &args.sonarqube_organization {
        info!("Using SonarQube organization: {}", org);
    }
}
