mod mcp;

use crate::mcp::prompts::{prompts_get, prompts_list};
use crate::mcp::resources::{resource_read, resources_list};
use crate::mcp::sonarqube::tools::init_sonarqube_client;
use crate::mcp::tools::{register_tools, tools_list};
use crate::mcp::types::{
    CancelledNotification, JsonRpcError, JsonRpcResponse, ToolCallRequestParams,
};
use crate::mcp::utilities::*;
use clap::Parser;
use rpc_router::{Error, Handler, Request, Router, RouterBuilder};
use serde_json::{Value, json};
use std::io;
use std::io::Write;
use std::thread;

// Platform-specific imports
#[cfg(unix)]
use signal_hook::consts::{SIGINT, SIGTERM};
#[cfg(unix)]
use signal_hook::iterator::Signals;

// Gracefully handle shutdown
fn setup_signal_handlers() {
    #[cfg(unix)]
    {
        let mut signals = Signals::new([SIGTERM, SIGINT]).unwrap();
        thread::spawn(move || {
            if let Some(_sig) = signals.forever().next() {
                graceful_shutdown();
                std::process::exit(0);
            }
        });
    }

    #[cfg(windows)]
    {
        // On Windows, we'll handle Ctrl+C using ctrlc crate
        ctrlc::set_handler(move || {
            graceful_shutdown();
            std::process::exit(0);
        })
        .expect("Error setting Ctrl-C handler");
    }
}

fn build_rpc_router() -> Router {
    let builder = RouterBuilder::default()
        // append resources here
        .append_dyn("initialize", initialize.into_dyn())
        .append_dyn("ping", ping.into_dyn())
        .append_dyn("logging/setLevel", logging_set_level.into_dyn())
        .append_dyn("roots/list", roots_list.into_dyn())
        .append_dyn("prompts/list", prompts_list.into_dyn())
        .append_dyn("prompts/get", prompts_get.into_dyn())
        .append_dyn("resources/list", resources_list.into_dyn())
        .append_dyn("resources/read", resource_read.into_dyn());
    let builder = register_tools(builder);
    builder.build()
}

#[tokio::main]
async fn main() {
    // clap args parser
    let args = Args::parse();
    if !args.mcp {
        display_info(&args).await;
        return;
    }

    // Initialize SonarQube client if environment variables are set
    if let Err(err) = init_sonarqube_client() {
        eprintln!("Warning: Failed to initialize SonarQube client: {}", err);
        eprintln!("SonarQube integration will be disabled");
        eprintln!("Set SONARQUBE_URL and SONARQUBE_TOKEN environment variables to enable");
        eprintln!(
            "If your SonarQube instance requires an organization, also set SONARQUBE_ORGANIZATION"
        );
    }

    // signal handling to exit cli
    setup_signal_handlers();
    // process json-rpc from MCP client
    let router = build_rpc_router();
    let mut line = String::default();
    let input = io::stdin();

    // Create a log file with a predictable pattern but still secure
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let log_dir = std::env::temp_dir();
    let log_path = log_dir.join(format!("sonarqube_mcp_server_{}.log", timestamp));

    let _logging_file = std::fs::File::create(&log_path).expect("Failed to create log file");
    eprintln!("Log file created at: {}", log_path.display());
    let mut logging_file = std::fs::OpenOptions::new()
        .append(true)
        .open(&log_path)
        .expect("Failed to reopen log file");

    while input.read_line(&mut line).unwrap() != 0 {
        let line = std::mem::take(&mut line);
        writeln!(logging_file, "{}", line).unwrap();
        if !line.is_empty() {
            if let Ok(json_value) = serde_json::from_str::<Value>(&line) {
                // notifications, no response required
                if json_value.is_object() && json_value.get("id").is_none() {
                    if let Some(method) = json_value.get("method") {
                        if method == "notifications/initialized" {
                            notifications_initialized();
                        } else if method == "notifications/cancelled" {
                            let params_value = json_value.get("params").unwrap();
                            let cancel_params: CancelledNotification =
                                serde_json::from_value(params_value.clone()).unwrap();
                            notifications_cancelled(cancel_params);
                        }
                    }
                } else if let Ok(mut rpc_request) = Request::from_value(json_value) {
                    // normal json-rpc message, and response expected
                    let id = rpc_request.id.clone();
                    if rpc_request.method == "tools/call" {
                        let params = serde_json::from_value::<ToolCallRequestParams>(
                            rpc_request.params.unwrap(),
                        )
                        .unwrap();
                        rpc_request = Request {
                            id: id.clone(),
                            method: params.name,
                            params: params.arguments,
                        }
                    }
                    match router.call(rpc_request).await {
                        Ok(call_response) => {
                            if !call_response.value.is_null() {
                                let response =
                                    JsonRpcResponse::new(id, call_response.value.clone());
                                let response_json = serde_json::to_string(&response).unwrap();
                                writeln!(logging_file, "{}\n", response_json).unwrap();
                                println!("{}", response_json);
                            }
                        }
                        Err(error) => {
                            if let Error::Handler(handler) = &error.error {
                                if let Some(error_value) = handler.get::<Value>() {
                                    let json_error = json!({
                                        "jsonrpc": "2.0",
                                        "error": error_value,
                                        "id": id
                                    });
                                    let response = serde_json::to_string(&json_error).unwrap();
                                    writeln!(logging_file, "{}\n", response).unwrap();
                                    println!("{}", response);
                                }
                            } else {
                                let json_error = JsonRpcError::new(id, -1, "Invalid json-rpc call");
                                let response = serde_json::to_string(&json_error).unwrap();
                                writeln!(logging_file, "{}\n", response).unwrap();
                                println!("{}", response);
                            }
                        }
                    }
                }
            }
        }
    }
}

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// list resources
    #[arg(long, default_value = "false")]
    resources: bool,
    /// list prompts
    #[arg(long, default_value = "false")]
    prompts: bool,
    /// list tools
    #[arg(long, default_value = "false")]
    tools: bool,
    /// start MCP server
    #[arg(long, default_value = "false")]
    mcp: bool,
    /// output as json-rpc format
    #[arg(long, default_value = "false")]
    json: bool,
}

impl Args {
    fn is_args_available(&self) -> bool {
        self.prompts || self.resources || self.tools
    }
}

async fn display_info(args: &Args) {
    if !args.is_args_available() {
        println!("Please use --help to see available options");
        return;
    }
    if args.json {
        // output as json
        if args.prompts {
            let prompts = prompts_list(None).await.unwrap();
            println!("{}", serde_json::to_string(&prompts).unwrap());
        }
        if args.resources {
            let resources = resources_list(None).await.unwrap();
            println!("{}", serde_json::to_string(&resources).unwrap());
        }
        if args.tools {
            let tools = tools_list(None).await.unwrap();
            println!("{}", serde_json::to_string(&tools).unwrap());
        }
    } else {
        // output as text
        if args.prompts {
            println!(
                r#"prompts:
- No prompts available
"#
            );
        }
        if args.resources {
            println!(
                r#"resources:
- sqlite: file:///path/to/sqlite.db
"#
            );
        }
        if args.tools {
            println!(
                r#"tools:
- sonarqube_get_metrics: get metrics for a SonarQube project
- sonarqube_get_issues: get issues for a SonarQube project
- sonarqube_get_quality_gate: get quality gate status for a SonarQube project
- sonarqube_list_projects: list all SonarQube projects
"#
            );
        }
    }
}
