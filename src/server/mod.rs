use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::time::Duration;

use clap::Parser;
use jsonrpsee_server::RpcModule;
use jsonrpsee_types::error::ErrorObject;
use once_cell::sync::OnceCell;
use tracing::info;

// Conditionally import Unix signal handling
#[cfg(unix)]
pub use tokio::signal::unix::{SignalKind, signal};

use crate::mcp::prompts::{prompts_get, prompts_list};
use crate::mcp::resources::{resource_read, resources_list};
use crate::mcp::sonarqube::tools::register_sonarqube_tools;
use crate::mcp::tools::register_tools;
use crate::mcp::types::{GetPromptRequest, ReadResourceRequest};

/// Static tracker for whether we've recently received an initialize request
pub static INITIALIZED_RECENTLY: OnceCell<Arc<AtomicBool>> = OnceCell::new();

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

#[cfg(unix)]
/// Sets up signal handlers for Unix systems.
///
/// This function sets up handlers for SIGTERM and SIGINT signals on Unix systems.
/// When either signal is received, it will set a flag indicating that the server
/// should shut down gracefully.
///
/// # Returns
///
/// Returns an atomic boolean wrapped in an Arc that will be set to false when
/// a termination signal is received.
pub async fn setup_signal_handlers() -> Arc<AtomicBool> {
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    // Use an atomic to track if we've received an initialize request recently
    let initialized_recently = Arc::new(AtomicBool::new(false));
    let init_tracker = initialized_recently.clone();

    // Expose the initialized_recently flag through a static for lifecycle to update
    INITIALIZED_RECENTLY
        .set(initialized_recently)
        .expect("Failed to set INITIALIZED_RECENTLY");

    tokio::spawn(async move {
        let mut sigterm = signal(SignalKind::terminate()).unwrap();
        let mut sigint = signal(SignalKind::interrupt()).unwrap();

        // Track time when initialization occurred
        let mut init_time = std::time::Instant::now();
        let grace_period = Duration::from_secs(10); // 10 second grace period
        let mut in_grace_period = false;

        loop {
            tokio::select! {
                _ = sigterm.recv() => {
                    // If we're in initialization grace period, ignore SIGTERMs
                    if init_tracker.load(Ordering::SeqCst) {
                        if !in_grace_period {
                            // Start the grace period
                            init_time = std::time::Instant::now();
                            in_grace_period = true;
                        }

                        // Check if we're still within grace period
                        if init_time.elapsed() < grace_period {
                            info!("Ignoring SIGTERM during initialization grace period ({:?} elapsed)", init_time.elapsed());
                            continue;
                        } else {
                            // Grace period expired
                            info!("Grace period expired, accepting SIGTERM");
                            init_tracker.store(false, Ordering::SeqCst);
                        }
                    }

                    info!("Received SIGTERM, shutting down");
                    r.store(false, Ordering::SeqCst);
                    break;
                }
                _ = sigint.recv() => {
                    info!("Received SIGINT, shutting down");
                    r.store(false, Ordering::SeqCst);
                    break;
                }
                _ = tokio::time::sleep(Duration::from_secs(1)) => {
                    if in_grace_period {
                        info!("In grace period, elapsed: {:?}", init_time.elapsed());
                    }
                    continue;
                }
            }
        }
    });

    running
}

#[cfg(not(unix))]
/// Sets up signal handlers for non-Unix systems.
///
/// This function sets up a handler for Ctrl+C (SIGINT) on non-Unix systems.
/// When the signal is received, it will set a flag indicating that the server
/// should shut down gracefully.
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

    // Register lifecycle methods with proper array-format parameter parsing
    router
        .register_async_method("initialize", |params, _| async move {
            tracing::info!("Received initialize params: {:?}", params);

            // First try to parse as a single element in an array
            // This is the format that Claude and other clients are sending
            match params.parse::<Vec<crate::mcp::types::InitializeRequest>>() {
                Ok(requests) if !requests.is_empty() => {
                    let request = &requests[0];
                    tracing::info!("Successfully parsed array-format initialize request");
                    crate::mcp::lifecycle::initialize(request.clone()).await
                }
                _ => {
                    // Fall back to trying direct parsing
                    match params.parse::<crate::mcp::types::InitializeRequest>() {
                        Ok(request) => {
                            tracing::info!("Successfully parsed direct initialize request");
                            crate::mcp::lifecycle::initialize(request).await
                        }
                        Err(err) => {
                            tracing::error!("Failed to parse initialize params: {}", err);
                            Err(ErrorObject::owned(
                                -32602,
                                "Invalid params structure",
                                Some(err.to_string()),
                            ))
                        }
                    }
                }
            }
        })
        .unwrap();

    router
        .register_async_method("initialized", |_, _| async move {
            tracing::info!("Handling initialized notification");
            crate::mcp::lifecycle::initialized().await
        })
        .unwrap();

    router
        .register_async_method("shutdown", |_, _| async move {
            tracing::info!("Handling shutdown request");
            crate::mcp::lifecycle::shutdown().await
        })
        .unwrap();

    router
        .register_async_method("exit", |_, _| async move {
            tracing::info!("Handling exit notification");
            crate::mcp::lifecycle::exit().await
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
    info!("Using stdio transport for JSON-RPC communication");
    info!("Connected to SonarQube at {}", args.sonarqube_url);
    if let Some(org) = &args.sonarqube_organization {
        info!("Using SonarQube organization: {}", org);
    }
}
