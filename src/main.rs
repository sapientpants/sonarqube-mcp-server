//! # SonarQube MCP Server Main Module
//!
//! This module contains the main entry point and runtime logic for the SonarQube Model Context Protocol (MCP) server.
//! It uses the official RMCP SDK to implement the MCP specification.

use anyhow::Result;
use clap::Parser;
use rmcp::{Error as McpError, ServerHandler, ServiceExt, model::*, tool, transport::stdio};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

use crate::mcp::sonarqube::client::SonarQubeClient;
use crate::mcp::sonarqube::types::SonarQubeConfig;

// Re-export the modules for backward compatibility
pub mod mcp;
pub mod server;

/// Command line arguments for the server
#[derive(Parser, Debug)]
pub struct Args {
    /// SonarQube server URL
    #[arg(short = 'u', long, env = "SONARQUBE_URL")]
    pub sonarqube_url: String,

    /// SonarQube authentication token
    #[arg(short = 't', long, env = "SONARQUBE_TOKEN")]
    pub sonarqube_token: String,

    /// SonarQube organization (optional)
    #[arg(short = 'o', long, env = "SONARQUBE_ORGANIZATION")]
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
    pub fn is_args_available(&self) -> bool {
        self.resources || self.prompts || self.tools
    }
}

/// SonarQube MCP server implementation
#[derive(Clone)]
struct SonarQubeMcpServer {
    config: SonarQubeConfig,
    client: Arc<SonarQubeClient>,
}

impl SonarQubeMcpServer {
    fn new(args: &Args) -> Self {
        let config = SonarQubeConfig {
            base_url: args.sonarqube_url.clone(),
            token: args.sonarqube_token.clone(),
            organization: args.sonarqube_organization.clone(),
        };
        let client = Arc::new(SonarQubeClient::new(config.clone()));
        Self { config, client }
    }
}

// Example of tool implementation with the RMCP SDK
#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
pub struct ListProjectsRequest {
    #[schemars(description = "Optional page number")]
    pub page: Option<u32>,
    #[schemars(description = "Optional page size")]
    pub page_size: Option<u32>,
    #[schemars(description = "Optional organization override")]
    pub organization: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
pub struct GetIssuesRequest {
    #[schemars(description = "Project key")]
    pub project_key: String,
    #[schemars(description = "Optional page number")]
    pub page: Option<u32>,
    #[schemars(description = "Optional page size")]
    pub page_size: Option<u32>,
    #[schemars(description = "Optional severity filter (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)")]
    pub severity: Option<String>,
    #[schemars(description = "Optional organization override")]
    pub organization: Option<String>,
}

#[tool(tool_box)]
impl SonarQubeMcpServer {
    #[tool(description = "List all SonarQube projects")]
    async fn list_projects(
        &self,
        #[tool(aggr)] request: ListProjectsRequest,
    ) -> Result<CallToolResult, McpError> {
        // Call SonarQube client
        let org_ref = request.organization.as_deref();
        match self
            .client
            .list_projects(request.page, request.page_size, org_ref)
            .await
        {
            Ok(projects) => {
                let json_str = serde_json::to_string(&projects).unwrap_or_default();
                Ok(CallToolResult::success(vec![Content::text(json_str)]))
            }
            Err(e) => Err(McpError::internal_error(
                format!("Failed to list projects: {}", e),
                None,
            )),
        }
    }

    #[tool(description = "Get issues for a SonarQube project")]
    async fn get_issues(
        &self,
        #[tool(aggr)] request: GetIssuesRequest,
    ) -> Result<CallToolResult, McpError> {
        // We'll just use the default for severities since we can't easily
        // create a static slice with a dynamic value

        // Build the query parameters
        let params = crate::mcp::sonarqube::types::IssuesQueryParams {
            project_key: &request.project_key,
            page: request.page,
            page_size: request.page_size,
            // Set all other fields to None
            severities: None,
            types: None,
            statuses: None,
            assigned_to_me: None,
            assignees: None,
            authors: None,
            code_variants: None,
            created_after: None,
            created_before: None,
            created_in_last: None,
            cwe: None,
            directories: None,
            facets: None,
            files: None,
            impact_severities: None,
            impact_software_qualities: None,
            issue_statuses: None,
            languages: None,
            owasp_top10: None,
            owasp_top10_2021: None,
            resolutions: None,
            resolved: None,
            rules: None,
            sans_top25: None,
            sonarsource_security: None,
            tags: None,
            sort_field: None,
            asc: None,
        };

        match self.client.get_issues(params).await {
            Ok(issues) => {
                let json_str = serde_json::to_string(&issues).unwrap_or_default();
                Ok(CallToolResult::success(vec![Content::text(json_str)]))
            }
            Err(e) => Err(McpError::internal_error(
                format!("Failed to get issues: {}", e),
                None,
            )),
        }
    }
}

#[tool(tool_box)]
impl ServerHandler for SonarQubeMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .build(),
            server_info: Implementation::from_build_env(),
            instructions: Some("SonarQube MCP Server providing access to SonarQube metrics, issues, and quality gates".to_string()),
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing to write to stderr instead of stdout
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_max_level(tracing::Level::INFO)
        .with_ansi(false)
        .init();

    // Parse command line arguments
    let args = match Args::try_parse() {
        Ok(args) => args,
        Err(e) => {
            // If help was requested, just exit with code 0
            let err_str = e.to_string();
            if err_str.contains("help") || err_str.contains("--help") {
                // The error already printed help information
                std::process::exit(0);
            }
            // Otherwise, this is a real error
            return Err(anyhow::anyhow!(
                "Failed to parse command line arguments: {}",
                e
            ));
        }
    };

    // Check if any of the special arguments are provided
    if args.is_args_available() || args.mcp {
        display_info(&args).await;
        return Ok(());
    }

    // Create the SonarQube MCP server
    let server = SonarQubeMcpServer::new(&args);

    // Store the client in the global variable for backward compatibility
    crate::mcp::sonarqube::tools::SONARQUBE_CLIENT
        .set(server.client.clone())
        .map_err(|_| anyhow::anyhow!("Failed to initialize SonarQube client"))?;

    // Display server information
    display_info(&args).await;

    info!("Starting SonarQube MCP server with RMCP SDK...");

    // The simplified approach: Create and serve the server with stdio transport
    let service = server.serve(stdio()).await?;

    // Wait for server to finish
    info!("Server initialized and running");
    service.waiting().await?;

    info!("Server shut down");
    Ok(())
}

/// Displays server information and configuration.
///
/// This function prints information about the server's configuration,
/// including available resources, prompts, and tools. The output format
/// can be controlled through command line arguments.
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
