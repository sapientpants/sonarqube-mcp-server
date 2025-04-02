use sonarqube_mcp_server::mcp::errors::{ApiError, McpError, ResultExt};
use sonarqube_mcp_server::mcp::sonarqube::types::SonarError;
use std::io::{Error as IoError, ErrorKind};

#[test]
fn test_mcp_error_conversion() {
    // Test converting SonarError to McpError
    let sonar_error = SonarError::AuthError;
    let mcp_error: McpError = sonar_error.into();
    match mcp_error {
        McpError::AuthError(_) => {}
        _ => panic!("Expected AuthError, got {:?}", mcp_error),
    }

    // Test converting IoError to McpError
    let io_error = IoError::new(ErrorKind::NotFound, "File not found");
    let mcp_error: McpError = io_error.into();
    match mcp_error {
        McpError::IoError(_) => {}
        _ => panic!("Expected IoError, got {:?}", mcp_error),
    }
}

#[test]
fn test_error_to_api_error() {
    // Create a McpError
    let error = McpError::NotFound("Resource not found".to_string());

    // Convert to ApiError
    let api_error: ApiError = error.into();

    // Verify fields
    assert!(api_error.message.contains("Resource not found"));
    assert!(api_error.details.is_none());
}

#[test]
fn test_result_ext() {
    // Test log_err on Ok result
    let ok_result: Result<i32, McpError> = Ok(42);
    let result = ok_result.log_err("test_context");
    assert_eq!(result.unwrap(), 42);

    // Test log_err on Err result
    // Note: In a real test, we would use a mock logger to verify the log was generated,
    // but for simplicity, we just check that the error is passed through
    let err_result: Result<i32, McpError> = Err(McpError::NotFound("test".to_string()));
    let result = err_result.log_err("test_context");
    assert!(result.is_err());
    match result {
        Err(McpError::NotFound(_)) => {}
        _ => panic!("Expected NotFound error"),
    }
}

#[test]
fn test_error_code_mapping() {
    // Test error code mapping for different error types
    let errors = [
        (McpError::InvalidRequest("test".to_string()), -32600),
        (McpError::MethodNotFound("test".to_string()), -32601),
        (McpError::AuthError("test".to_string()), -33001),
        (McpError::ConfigError("test".to_string()), -33002),
        (McpError::NotFound("test".to_string()), -33003),
        (McpError::ExternalApiError("test".to_string()), -33004),
    ];

    for (error, expected_code) in errors {
        assert_eq!(error.error_code(), expected_code);
    }
}
