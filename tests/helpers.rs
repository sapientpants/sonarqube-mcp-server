use std::fs;
use std::path::Path;

/// Load a JSON fixture file from the tests/fixtures directory
pub fn load_fixture(filename: &str) -> String {
    let path = Path::new("tests/fixtures").join(filename);
    fs::read_to_string(path).unwrap_or_else(|_| panic!("Failed to read fixture file: {}", filename))
}

/// Get a mock SonarQube base URL for testing
pub fn mock_base_url(mock_server: &wiremock::MockServer) -> String {
    mock_server.uri()
}

/// Get a mock SonarQube token for testing
pub fn mock_token() -> String {
    "test-token".to_string()
}

/// Get a test project key for testing
pub fn test_project_key() -> String {
    "test-project".to_string()
}
