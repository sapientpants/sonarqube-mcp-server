//! # SonarQube MCP Server Main Module
//!
//! This module contains the main entry point and runtime logic for the SonarQube Model Context Protocol (MCP) server.
//! It uses the official RMCP SDK to implement the MCP specification.

use anyhow::Result;
use clap::Parser;
use jsonrpsee::RpcModule;
use jsonrpsee::server::ServerBuilder;
use jsonrpsee::types::ErrorObjectOwned;
use rmcp::{Error as RmcpError, ServerHandler, ServiceExt, model::*, tool};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tokio::signal;
use tracing::{error, info};

use crate::mcp::core::config::{LoggingConfig, McpConfig, ServerConfig};
use crate::mcp::sonarqube::config::SonarQubeConfig;
use crate::mcp::sonarqube::context::ServerContext;
use crate::mcp::sonarqube::types::SonarQubeConfig as SonarQubeClientConfig;
use crate::server::Args;

// Re-export the modules for backward compatibility
/// Module containing MCP protocol implementation and related functionality
pub mod mcp;
/// Module defining the JSON-RPC server infrastructure and endpoints
pub mod server;

/// SonarQube MCP Server implementation
pub struct SonarQubeMcpServer {
    context: ServerContext,
}

impl SonarQubeMcpServer {
    /// Create a new server instance
    pub fn new(args: &Args) -> Result<Self, RmcpError> {
        // Load configuration
        let config = match McpConfig::default() {
            cfg => {
                if let Some(sonarqube_url) = args.sonarqube_url.as_ref() {
                    let sonarqube_config = SonarQubeConfig {
                        url: sonarqube_url.clone(),
                        token: args.sonarqube_token.clone(),
                        organization: args.sonarqube_organization.clone(),
                        debug: Some(false),
                    };
                    cfg
                } else {
                    return Err(RmcpError::new(
                        ErrorCode::ConfigurationError,
                        "No SonarQube URL provided",
                        None,
                    ));
                }
            }
        };

        // Create SonarQube client config
        let sonarqube_client_config = SonarQubeClientConfig {
            base_url: config.server.host.clone(),
            token: config.server.host.clone(),
            organization: None,
        };

        // Create server context
        let context = ServerContext::new_with_mcp_context(&config, &sonarqube_client_config)
            .map_err(|e| {
                RmcpError::new(
                    ErrorCode::ConfigurationError,
                    format!("Failed to create server context: {}", e),
                    None,
                )
            })?;

        Ok(Self { context })
    }
}

/// Request parameters for listing SonarQube projects
///
/// This struct defines the parameters for the SonarQube project listing tool.
#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
pub struct ListProjectsRequest {
    /// Optional page number for pagination
    #[schemars(description = "Optional page number")]
    pub page: Option<u32>,

    /// Optional page size for pagination
    #[schemars(description = "Optional page size")]
    pub page_size: Option<u32>,

    /// Optional organization override to specify a different organization than the default
    #[schemars(description = "Optional organization override")]
    pub organization: Option<String>,
}

/// Request parameters for fetching SonarQube issues
///
/// This struct defines the parameters for the SonarQube issues retrieval tool.
#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
pub struct GetIssuesRequest {
    /// Project key identifier in SonarQube
    #[schemars(description = "Project key")]
    pub project_key: String,

    /// Optional page number for pagination
    #[schemars(description = "Optional page number")]
    pub page: Option<u32>,

    /// Optional page size for pagination
    #[schemars(description = "Optional page size")]
    pub page_size: Option<u32>,

    /// Optional severity filter (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)
    #[schemars(description = "Optional severity filter (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)")]
    pub severity: Option<String>,

    /// Optional organization override to specify a different organization than the default
    #[schemars(description = "Optional organization override")]
    pub organization: Option<String>,
}

#[tool(tool_box)]
impl SonarQubeMcpServer {
    #[tool(description = "List all SonarQube projects")]
    async fn list_projects(
        &self,
        #[tool(aggr)] request: ListProjectsRequest,
    ) -> Result<CallToolResult, RmcpError> {
        // Call SonarQube client
        let org_ref = request.organization.as_deref();
        match self
            .context
            .client
            .list_projects(request.page, request.page_size, org_ref)
            .await
        {
            Ok(projects) => {
                let json_str = serde_json::to_string(&projects).unwrap_or_default();
                Ok(CallToolResult::success(vec![Content::text(json_str)]))
            }
            Err(e) => Err(RmcpError::new(
                ErrorCode::InternalError,
                format!("Failed to list projects: {}", e),
                None,
            )),
        }
    }

    #[tool(description = "Get issues for a SonarQube project")]
    async fn get_issues(
        &self,
        #[tool(aggr)] request: GetIssuesRequest,
    ) -> Result<CallToolResult, RmcpError> {
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

        match self.context.client.get_issues(params).await {
            Ok(issues) => {
                let json_str = serde_json::to_string(&issues).unwrap_or_default();
                Ok(CallToolResult::success(vec![Content::text(json_str)]))
            }
            Err(e) => Err(RmcpError::new(
                ErrorCode::InternalError,
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
    let args = Args::parse();

    // Load configuration
    let _config = McpConfig::default();

    // Initialize tracing based on configuration
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // If arguments are provided, display information and exit
    if args.is_args_available() {
        info!("Arguments provided: {:?}", args);
        return Ok(());
    }

    // Create and initialize the server
    let server = SonarQubeMcpServer::new(&args)?;
    info!("Server initialized with configuration");

    // Run the server using stdio transport
    info!("Starting server with stdio transport");

    // Use the ServiceExt trait to create a service
    let service = server.serve(rmcp::transport::io::stdio()).await?;

    // Wait for the service to complete
    info!("Server running, waiting for completion");
    service.waiting().await?;

    info!("Server shutting down gracefully");
    Ok(())
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
pub async fn display_info(args: &Args) {
    info!("Starting SonarQube MCP server...");
    info!("Using the official RMCP SDK for MCP communication");
    if let Some(url) = &args.sonarqube_url {
        info!("Connected to SonarQube at {}", url);
    }
    if let Some(org) = &args.sonarqube_organization {
        info!("Using SonarQube organization: {}", org);
    }
}
