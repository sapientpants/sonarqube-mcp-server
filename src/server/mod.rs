use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::Result;
use clap::Parser;
use jsonrpsee_server::{RpcModule, ServerBuilder, ServerHandle};
use jsonrpsee_types::error::ErrorObject;

// Conditionally import Unix signal handling
#[cfg(unix)]
pub use tokio::signal::unix::{SignalKind, signal};

use tracing::info;

use crate::mcp::prompts::{prompts_get, prompts_list};
use crate::mcp::resources::{resource_read, resources_list};
use crate::mcp::sonarqube::tools::register_sonarqube_tools;
use crate::mcp::tools::register_tools;
use crate::mcp::types::{GetPromptRequest, ReadResourceRequest, SetLevelRequest};
use crate::mcp::utilities::{ping, set_level};

/// Command line arguments for the server
#[derive(Parser, Debug)]
pub struct Args {
    /// Port to listen on
    #[arg(short, long, default_value_t = 3000)]
    pub port: u16,

    /// Host address to bind to
    #[arg(short = 'H', long, default_value = "127.0.0.1")]
    pub host: String,

    /// SonarQube server URL
    #[arg(short = 'u', long, env = "SONARQUBE_URL")]
    pub sonarqube_url: String,

    /// SonarQube authentication token
    #[arg(short = 't', long, env = "SONARQUBE_TOKEN")]
    pub sonarqube_token: String,

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

// Conditionally define setup_signal_handlers
#[cfg(unix)]
pub async fn setup_signal_handlers() -> Arc<AtomicBool> {
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    tokio::spawn(async move {
        let mut sigterm = signal(SignalKind::terminate()).unwrap();
        let mut sigint = signal(SignalKind::interrupt()).unwrap();

        tokio::select! {
            _ = sigterm.recv() => {
                info!("Received SIGTERM");
                r.store(false, Ordering::SeqCst);
            }
            _ = sigint.recv() => {
                info!("Received SIGINT");
                r.store(false, Ordering::SeqCst);
            }
        }
    });

    running
}

#[cfg(not(unix))]
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

/// Builds the RPC router for the MCP server.
///
/// This function creates and configures the RPC router that handles
/// all incoming requests to the MCP server. It registers all available
/// tools and their handlers.
///
/// # Returns
///
/// Returns the configured RPC router
pub fn build_rpc_router() -> RpcModule<()> {
    let mut router = RpcModule::new(());

    // Register core methods
    router
        .register_async_method("ping", |_, _| async move {
            ping(None).await.map_err(|e| {
                ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
            })
        })
        .unwrap();

    router
        .register_async_method("set_level", |params, _| async move {
            let request = params.parse::<SetLevelRequest>()?;
            set_level(request).await.map_err(|e| {
                ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
            })
        })
        .unwrap();

    // Register resource methods
    router
        .register_async_method("resources/list", |_, _| async move {
            resources_list(None).await.map_err(|e| {
                ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
            })
        })
        .unwrap();

    router
        .register_async_method("resources/read", |params, _| async move {
            let request = params.parse::<ReadResourceRequest>()?;
            resource_read(request).await.map_err(|e| {
                ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
            })
        })
        .unwrap();

    // Register prompt methods
    router
        .register_async_method("prompts/list", |_, _| async move {
            prompts_list(None).await.map_err(|e| {
                ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
            })
        })
        .unwrap();

    router
        .register_async_method("prompts/get", |params, _| async move {
            let request = params.parse::<GetPromptRequest>()?;
            prompts_get(request).await.map_err(|e| {
                ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
            })
        })
        .unwrap();

    // Register domain-specific tools
    register_tools(&mut router).unwrap();
    register_sonarqube_tools(&mut router).unwrap();

    router
}

/// Starts the MCP server.
///
/// This function initializes and starts the MCP server, binding it to
/// the specified address and port. It sets up the RPC router and starts
/// listening for incoming connections.
///
/// # Arguments
///
/// * `addr` - The socket address to bind the server to
///
/// # Returns
///
/// Returns a result containing the server handle
pub async fn start_server(addr: SocketAddr) -> Result<ServerHandle> {
    let server = ServerBuilder::default()
        .build(addr)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to build server: {}", e))?;

    let module = build_rpc_router();
    let handle = server.start(module);

    info!("Server started at {}", addr);
    Ok(handle)
}

/// Displays server information
pub async fn display_info(args: &Args) {
    info!("Starting SonarQube MCP server...");
    info!("Listening on {}:{}", args.host, args.port);
    info!("Connected to SonarQube at {}", args.sonarqube_url);
}
