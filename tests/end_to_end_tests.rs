mod helpers;

use helpers::{load_fixture, mock_token, test_project_key};
use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::{
    process::{Child, Command},
    thread,
    time::Duration,
};
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, path, query_param},
};

// This test is more complex and requires starting the MCP server as a separate process
// and communicating with it via JSON-RPC over a socket
#[tokio::test]
#[ignore] // This test is more complex and might need manual setup, so we mark it as ignored by default
async fn test_mcp_server_with_sonarqube_tools() {
    // Setup mock SonarQube server
    let mock_server = MockServer::start().await;

    // Configure mock responses for metrics endpoint
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("component", "test-project"))
        .respond_with(
            ResponseTemplate::new(200).set_body_string(load_fixture("metrics_response.json")),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    // Find an available port for our test server
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind to random port");
    let port = listener.local_addr().unwrap().port();
    // The listener will be dropped automatically when it goes out of scope

    // Start MCP server in a separate process
    let server_process = start_mcp_server(mock_server.uri(), mock_token(), port);
    let server_process = Arc::new(Mutex::new(server_process));

    // Make sure to kill the server process when the test ends
    let server_process_clone = Arc::clone(&server_process);
    let _guard = scopeguard::guard((), move |_| {
        if let Ok(mut process) = server_process_clone.lock() {
            let _ = process.kill();
        }
    });

    // Give the server some time to start
    thread::sleep(Duration::from_secs(2));

    // Connect to the MCP server
    let mut stream = match TcpStream::connect(format!("127.0.0.1:{}", port)) {
        Ok(stream) => stream,
        Err(e) => {
            panic!("Failed to connect to MCP server: {}", e);
        }
    };

    // Send initialize request
    let initialize_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "client_info": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    });

    send_request(&mut stream, &initialize_request);

    // Read response
    let response = read_response(&mut stream);
    assert_eq!(response["id"], 1);
    assert!(response["result"].is_object());

    // Send get_metrics request
    let get_metrics_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "sonarqube/get_metrics",
        "params": {
            "project_key": test_project_key(),
            "metrics": ["ncloc", "bugs", "vulnerabilities"]
        }
    });

    send_request(&mut stream, &get_metrics_request);

    // Read response
    let response = read_response(&mut stream);
    assert_eq!(response["id"], 2);
    assert!(response["result"].is_object());

    // Verify metrics in response
    let metrics = &response["result"]["metrics"];
    assert!(metrics.is_array());

    let metrics_array = metrics.as_array().unwrap();
    assert!(
        metrics_array
            .iter()
            .any(|m| m["key"] == "ncloc" && m["value"] == "1200")
    );
    assert!(
        metrics_array
            .iter()
            .any(|m| m["key"] == "bugs" && m["value"] == "12")
    );

    // Shutdown the server
    let shutdown_request = json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "shutdown",
        "params": {}
    });

    send_request(&mut stream, &shutdown_request);

    // Read response
    let response = read_response(&mut stream);
    assert_eq!(response["id"], 3);

    // Send exit notification
    let exit_notification = json!({
        "jsonrpc": "2.0",
        "method": "exit",
        "params": {}
    });

    send_request(&mut stream, &exit_notification);
}

// Helper function to start the MCP server process
fn start_mcp_server(sonarqube_url: String, sonarqube_token: String, port: u16) -> Child {
    Command::new("cargo")
        .args(["run", "--", "--port", &port.to_string()])
        .env("SONARQUBE_URL", sonarqube_url)
        .env("SONARQUBE_TOKEN", sonarqube_token)
        .spawn()
        .expect("Failed to start MCP server")
}

// Helper function to send a JSON-RPC request
fn send_request(stream: &mut TcpStream, request: &Value) {
    let request_str = serde_json::to_string(request).unwrap();
    writeln!(stream, "{}", request_str).expect("Failed to send request");
}

// Helper function to read a JSON-RPC response
fn read_response(stream: &mut TcpStream) -> Value {
    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut response_str = String::default();
    reader
        .read_line(&mut response_str)
        .expect("Failed to read response");
    serde_json::from_str(&response_str).expect("Failed to parse response")
}
