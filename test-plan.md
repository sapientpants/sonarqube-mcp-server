# SonarQube MCP Server Test Plan

This document outlines a comprehensive test plan to improve code coverage for the SonarQube MCP Server project.

## Current Test Coverage Analysis

The codebase currently has several test modules, including:

- `main_tests.rs`: Tests for CLI argument parsing
- `sonarqube_types_tests.rs`: Tests for SonarQube data types 
- `sonarqube_tools_tests.rs`: Tests for SonarQube tool functionality
- `client_tests.rs`: Tests for SonarQube client operations
- `resources_tests.rs`: Tests for resource management
- `types_tests.rs`: Tests for MCP data types
- `end_to_end_tests.rs`: Integration tests
- `output_test.rs`: Tests for output formatting
- `tools_tests.rs`: Tests for general MCP tool functionality
- `prompts_tests.rs`: Tests for prompt management
- `utilities_tests.rs`: Tests for utility functions

## Identified Test Coverage Gaps

Based on code analysis, the following areas need improved test coverage:

### 1. Main Module Coverage

- **`setup_signal_handlers()`**: Not tested with proper signal simulation
- **`build_rpc_router()`**: Limited testing of router configuration
- **`display_info()`**: Incomplete testing of output formatting
- **`main()`**: Limited testing of the main JSON-RPC server loop

### 2. SonarQube Integration

- **Error handling**: Test cases for API failures and connection issues
- **Authentication**: Tests for token validation and refresh
- **Query rate limiting**: Tests for respecting rate limits

### 3. JSON-RPC Communication

- **Request parsing**: Tests for malformed requests
- **Response formatting**: Validation of response structure
- **Error handling**: Verification of error responses

### 4. MCP Module

#### Utilities
- **Notification handlers**: Tests for notification processing
- **Graceful shutdown**: Verification of cleanup procedures

#### Resources
- **Edge cases**: Tests for missing or malformed resources

#### Tools
- **Tool registration**: Verify all tools are properly registered

## Test Implementation Plan

### 1. Unit Tests

#### Main Module Tests

```rust
// Tests for build_rpc_router
fn test_build_rpc_router() {
    // Verify all expected routes are registered
    let router = build_rpc_router();
    assert!(router.has_method("initialize"));
    assert!(router.has_method("tools/list"));
    // Add assertions for all expected methods
}

// Tests for display_info with mocks
async fn test_display_info_json_format() {
    // Mock stdout to capture output
    // Verify JSON output format is correct
}

async fn test_display_info_text_format() {
    // Mock stdout to capture output
    // Verify text output format is correct
}
```

#### Signal Handler Tests

```rust
#[cfg(unix)]
#[test]
fn test_signal_handler_sigterm() {
    // Mock signal handling
    // Verify graceful shutdown occurs
}

#[cfg(windows)]
#[test]
fn test_ctrl_c_handler() {
    // Mock Ctrl+C event
    // Verify graceful shutdown occurs
}
```

#### JSON-RPC Request/Response Tests

```rust
#[test]
async fn test_malformed_request_handling() {
    // Send malformed JSON
    // Verify appropriate error response
}

#[test]
async fn test_unknown_method_handling() {
    // Request non-existent method
    // Verify method not found error
}

#[test]
async fn test_notification_handling() {
    // Send notifications
    // Verify proper processing
}
```

### 2. Integration Tests

#### SonarQube API Integration Tests

```rust
#[test]
async fn test_sonarqube_authentication_failure() {
    // Mock SonarQube API with invalid token
    // Verify proper error handling
}

#[test]
async fn test_sonarqube_rate_limiting() {
    // Mock SonarQube API with rate limit headers
    // Verify rate limiting behavior
}

#[test]
async fn test_sonarqube_connection_failure() {
    // Mock SonarQube API connection failure
    // Verify graceful error handling
}
```

#### End-to-End Tests

```rust
#[test]
async fn test_full_request_response_cycle() {
    // Start server
    // Send complete request
    // Verify response
    // Shutdown server
}

#[test]
async fn test_concurrent_requests() {
    // Start server
    // Send multiple concurrent requests
    // Verify all responses
    // Shutdown server
}
```

### 3. Performance Tests

```rust
#[test]
async fn test_large_response_handling() {
    // Request that generates large response
    // Verify proper streaming/pagination
}

#[test]
async fn test_memory_usage() {
    // Monitor memory during operations
    // Verify no excessive memory usage
}
```

## Implementation Priority

1. **High Priority**
   - JSON-RPC request/response handling tests
   - Error handling tests
   - SonarQube API integration tests

2. **Medium Priority**
   - Signal handler tests
   - Main module tests
   - Performance tests

3. **Low Priority**
   - Additional edge cases
   - Stress tests

## Test Environment Requirements

- Mock HTTP server for SonarQube API
- Capture stdout/stderr for output validation
- Signal simulation capabilities
- Memory profiling tools

## Metrics for Success

- Achieve >80% code coverage overall
- Ensure all public functions have tests
- Cover error handling pathways
- Validate all tool registrations 

## Expanded Tests for Main Module Coverage

### 1. Signal Handler Tests

```rust
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Duration;

#[cfg(unix)]
mod unix_signal_tests {
    use super::*;
    use std::process;
    use signal_hook::consts::{SIGTERM, SIGINT};
    use nix::sys::signal::{self, Signal};
    use nix::unistd::Pid;

    #[test]
    fn test_sigterm_handling() {
        // Create a flag to track if shutdown was called
        let shutdown_called = Arc::new(AtomicBool::new(false));
        let shutdown_called_clone = Arc::clone(&shutdown_called);
        
        // Override the graceful_shutdown function for testing
        let _guard = setup_test_shutdown_handler(move || {
            shutdown_called_clone.store(true, Ordering::SeqCst);
        });
        
        // Setup signal handlers
        setup_signal_handlers();
        
        // Send SIGTERM to self
        signal::kill(Pid::from_raw(process::id() as i32), Signal::SIGTERM)
            .expect("Failed to send SIGTERM");
            
        // Give time for signal handler to run
        std::thread::sleep(Duration::from_millis(100));
        
        // Check if shutdown was called
        assert!(shutdown_called.load(Ordering::SeqCst), 
                "Graceful shutdown not called after SIGTERM");
    }

    #[test]
    fn test_sigint_handling() {
        // Similar to above but with SIGINT
        let shutdown_called = Arc::new(AtomicBool::new(false));
        let shutdown_called_clone = Arc::clone(&shutdown_called);
        
        let _guard = setup_test_shutdown_handler(move || {
            shutdown_called_clone.store(true, Ordering::SeqCst);
        });
        
        setup_signal_handlers();
        
        signal::kill(Pid::from_raw(process::id() as i32), Signal::SIGINT)
            .expect("Failed to send SIGINT");
            
        std::thread::sleep(Duration::from_millis(100));
        
        assert!(shutdown_called.load(Ordering::SeqCst), 
                "Graceful shutdown not called after SIGINT");
    }
}

#[cfg(windows)]
mod windows_signal_tests {
    use super::*;
    
    #[test]
    fn test_ctrl_c_handler() {
        // Create a flag to track if shutdown was called
        let shutdown_called = Arc::new(AtomicBool::new(false));
        let shutdown_called_clone = Arc::clone(&shutdown_called);
        
        // Override the graceful_shutdown function for testing
        let _guard = setup_test_shutdown_handler(move || {
            shutdown_called_clone.store(true, Ordering::SeqCst);
        });
        
        // Setup signal handlers
        setup_signal_handlers();
        
        // Simulate Ctrl+C event
        unsafe {
            windows::Win32::System::Console::GenerateConsoleCtrlEvent(
                windows::Win32::System::Console::CTRL_C_EVENT, 0).ok();
        }
        
        // Give time for handler to run
        std::thread::sleep(Duration::from_millis(100));
        
        // Check if shutdown was called
        assert!(shutdown_called.load(Ordering::SeqCst), 
                "Graceful shutdown not called after Ctrl+C");
    }
}
```

### 2. Router Configuration Tests

```rust
use rpc_router::{Request, Router};
use serde_json::json;

#[tokio::test]
async fn test_build_rpc_router_methods() {
    // Create the router
    let router = build_rpc_router();
    
    // Define list of required methods that must be present
    let required_methods = [
        "initialize", 
        "ping", 
        "logging/setLevel", 
        "roots/list", 
        "prompts/list", 
        "prompts/get", 
        "resources/list", 
        "resources/read",
        "sonarqube/list_projects",
        "sonarqube/get_metrics",
        "sonarqube/get_issues", 
        "sonarqube/get_quality_gate",
        "tools/list"
    ];
    
    // Check that all required methods are registered
    for method in required_methods {
        assert!(router.has_method(method), "Router missing method: {}", method);
    }
}

#[tokio::test]
async fn test_router_method_invocation() {
    let router = build_rpc_router();
    
    // Test ping method
    let ping_request = Request {
        id: "test-1".into(),
        method: "ping".into(),
        params: Some(json!({})),
    };
    
    let ping_response = router.call(ping_request).await.expect("Ping method failed");
    assert_eq!(ping_response.value, json!("pong"), "Ping response incorrect");
    
    // Test tools/list method
    let tools_list_request = Request {
        id: "test-2".into(),
        method: "tools/list".into(),
        params: Some(json!({})),
    };
    
    let tools_response = router.call(tools_list_request).await.expect("Tools list method failed");
    assert!(tools_response.value.is_array(), "Tools list response should be an array");
    
    // ... Add tests for other methods as needed
}
```

### 3. Display Info Tests

```rust
use std::io::{self, Cursor};
use std::str::from_utf8;

// Mock stdout for testing output
struct StdoutMock {
    buffer: Cursor<Vec<u8>>,
}

impl StdoutMock {
    fn new() -> Self {
        Self {
            buffer: Cursor::new(Vec::new()),
        }
    }
    
    fn get_output(&self) -> String {
        from_utf8(self.buffer.get_ref()).unwrap().to_string()
    }
}

impl Write for StdoutMock {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.buffer.write(buf)
    }
    
    fn flush(&mut self) -> io::Result<()> {
        self.buffer.flush()
    }
}

#[tokio::test]
async fn test_display_info_json_all_flags() {
    // Create mock stdout
    let mut mock_stdout = StdoutMock::new();
    
    // Setup args with all flags enabled
    let args = Args {
        resources: true,
        prompts: true,
        tools: true,
        mcp: false,
        json: true,
    };
    
    // Call display_info with stdout redirected to our mock
    {
        let _guard = redirect_stdout(&mut mock_stdout);
        display_info(&args).await;
    }
    
    // Get captured output
    let output = mock_stdout.get_output();
    
    // Verify JSON formatting
    assert!(output.contains("\"tools\""), "Output missing tools list");
    assert!(output.contains("\"resources\""), "Output missing resources list");
    assert!(output.contains("\"prompts\""), "Output missing prompts list");
    
    // Verify output is valid JSON
    let json_result: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(json_result.is_ok(), "Output is not valid JSON");
}

#[tokio::test]
async fn test_display_info_text_format() {
    // Create mock stdout
    let mut mock_stdout = StdoutMock::new();
    
    // Setup args for text output
    let args = Args {
        resources: true,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    
    // Call display_info with stdout redirected
    {
        let _guard = redirect_stdout(&mut mock_stdout);
        display_info(&args).await;
    }
    
    // Get captured output
    let output = mock_stdout.get_output();
    
    // Verify text formatting (not JSON)
    assert!(output.contains("resources:"), "Output missing resources header");
    
    // Ensure output is not JSON formatted
    let json_result: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(json_result.is_err(), "Output should not be valid JSON");
}

#[tokio::test]
async fn test_display_info_no_args() {
    // Create mock stdout
    let mut mock_stdout = StdoutMock::new();
    
    // Setup args with no flags
    let args = Args {
        resources: false,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    
    // Call display_info with stdout redirected
    {
        let _guard = redirect_stdout(&mut mock_stdout);
        display_info(&args).await;
    }
    
    // Get captured output
    let output = mock_stdout.get_output();
    
    // Verify help message is shown
    assert!(output.contains("Please use --help"), "Help message not displayed");
}
```

### 4. Main JSON-RPC Loop Tests

```rust
use std::io::{self, Read, Write};
use std::sync::mpsc::{self, Receiver, Sender};
use tokio::sync::oneshot;

struct MockIO {
    input: Box<dyn Read>,
    output: Box<dyn Write>,
}

#[tokio::test]
async fn test_main_json_rpc_handler() {
    // Create channels for mock IO
    let (sender, receiver) = mpsc::channel::<String>();
    let (output_sender, output_receiver) = mpsc::channel::<String>();
    
    // Create mock IO with our channels
    let mock_io = MockIO {
        input: Box::new(MockRead::new(receiver)),
        output: Box::new(MockWrite::new(output_sender)),
    };
    
    // Set up shutdown channel to terminate main loop
    let (shutdown_sender, shutdown_receiver) = oneshot::channel::<()>();
    
    // Start main loop in separate task
    let handle = tokio::spawn(async move {
        let result = run_main_loop_with_io(mock_io, shutdown_receiver).await;
        assert!(result.is_ok(), "Main loop returned error: {:?}", result);
    });
    
    // Send initialize request
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {}
    }).to_string();
    sender.send(init_request).unwrap();
    
    // Wait for and validate response
    let init_response = output_receiver.recv_timeout(std::time::Duration::from_secs(1))
        .expect("No response received for initialize request");
    
    // Check response format
    let response_json: serde_json::Value = serde_json::from_str(&init_response)
        .expect("Response is not valid JSON");
    assert_eq!(response_json["jsonrpc"], "2.0", "Invalid jsonrpc version");
    assert_eq!(response_json["id"], 1, "Response ID mismatch");
    assert!(response_json["result"].is_object(), "Result is not an object");
    
    // Send a malformed request
    sender.send("invalid json".into()).unwrap();
    
    // Check error response
    let error_response = output_receiver.recv_timeout(std::time::Duration::from_secs(1))
        .expect("No response received for invalid request");
    
    let error_json: serde_json::Value = serde_json::from_str(&error_response)
        .expect("Error response is not valid JSON");
    assert!(error_json["error"].is_object(), "Error field missing");
    
    // Send notification
    let notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    }).to_string();
    sender.send(notification).unwrap();
    
    // Notifications don't get responses, but we should check the server didn't crash
    // Wait a bit and then try a normal request again
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    // Send ping request
    let ping_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "ping",
        "params": {}
    }).to_string();
    sender.send(ping_request).unwrap();
    
    // Check ping response
    let ping_response = output_receiver.recv_timeout(std::time::Duration::from_secs(1))
        .expect("No response received for ping request");
    let ping_json: serde_json::Value = serde_json::from_str(&ping_response)
        .expect("Ping response is not valid JSON");
    assert_eq!(ping_json["result"], "pong", "Incorrect ping response");
    
    // Shutdown the server
    shutdown_sender.send(()).unwrap();
    
    // Wait for server to exit
    handle.await.expect("Server task panicked");
}

#[tokio::test]
async fn test_main_handles_cancelled_notification() {
    // Similar setup to the above test
    let (sender, receiver) = mpsc::channel::<String>();
    let (output_sender, output_receiver) = mpsc::channel::<String>();
    
    let mock_io = MockIO {
        input: Box::new(MockRead::new(receiver)),
        output: Box::new(MockWrite::new(output_sender)),
    };
    
    let (shutdown_sender, shutdown_receiver) = oneshot::channel::<()>();
    
    let handle = tokio::spawn(async move {
        run_main_loop_with_io(mock_io, shutdown_receiver).await.unwrap();
    });
    
    // Send a tool/call request
    let tool_request = json!({
        "jsonrpc": "2.0",
        "id": "tool-1",
        "method": "tools/call",
        "params": {
            "name": "sonarqube/list_projects",
            "arguments": {}
        }
    }).to_string();
    sender.send(tool_request).unwrap();
    
    // Before getting response, send cancellation
    let cancel_notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/cancelled",
        "params": {
            "id": "tool-1"
        }
    }).to_string();
    sender.send(cancel_notification).unwrap();
    
    // Check if we get a cancelled response or no response
    match output_receiver.recv_timeout(std::time::Duration::from_millis(500)) {
        Ok(response) => {
            // If we get a response, make sure it's a cancellation or error
            let response_json: serde_json::Value = serde_json::from_str(&response).unwrap();
            if response_json.get("error").is_some() {
                assert_eq!(response_json["id"], "tool-1", "Error ID mismatch");
                assert!(response_json["error"]["message"].as_str().unwrap()
                        .contains("cancelled"), 
                        "Error should indicate cancellation");
            }
        },
        Err(_) => {
            // It's valid to not receive a response for a cancelled request
        }
    }
    
    // Shutdown the server
    shutdown_sender.send(()).unwrap();
    handle.await.unwrap();
}
```

These expanded tests provide comprehensive coverage for the Main Module by:

1. Testing signal handling with proper simulations for both Unix and Windows platforms
2. Validating the router configuration with both static checks and dynamic invocation tests
3. Thoroughly testing the display_info function with mocked stdout capturing
4. Implementing a complete test of the main JSON-RPC message loop to ensure proper request/response handling

The tests include appropriate mocking utilities and assertions to verify the expected behaviors under various conditions. 