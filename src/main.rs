//! # SonarQube MCP Server Main Module
//!
//! This module contains the main entry point and runtime logic for the SonarQube MCP server.
//! It handles JSON-RPC communication with clients, command-line argument parsing, and
//! initializes the server components.

mod mcp;
pub mod server;

use anyhow::Result;
use clap::Parser;
use std::net::SocketAddr;
use tokio::time::Duration;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    // Parse command line arguments
    let args = match server::Args::try_parse() {
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

    // Display server information
    server::display_info(&args).await;

    // Setup signal handlers
    let running = server::setup_signal_handlers().await;

    // Build the RPC router
    let router = server::build_rpc_router();

    // Start the server
    let addr = format!("{}:{}", args.host, args.port).parse::<SocketAddr>()?;
    let server = jsonrpsee_server::ServerBuilder::default()
        .build(addr)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to build server: {}", e))?;

    let handle = server.start(router);
    info!("Server started at {}", addr);

    // Wait for shutdown signal
    while running.load(std::sync::atomic::Ordering::SeqCst) {
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    // Shutdown server
    handle.stop()?;
    info!("Server stopped");

    Ok(())
}
