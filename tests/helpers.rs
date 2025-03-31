use std::env;
use std::fs;
use std::path::Path;
use wiremock::MockServer;

/// Load a JSON fixture file from the tests/fixtures directory
pub fn load_fixture(name: &str) -> String {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("Failed to get manifest directory");
    let fixture_path = Path::new(&manifest_dir)
        .join("tests")
        .join("fixtures")
        .join(name);
    println!(
        "Attempting to load fixture from: {}",
        fixture_path.display()
    );
    if !fixture_path.exists() {
        panic!("Fixture file does not exist: {}", fixture_path.display());
    }
    std::fs::read_to_string(&fixture_path)
        .unwrap_or_else(|e| panic!("Failed to load fixture: {} - {}", name, e))
}

/// Get a mock SonarQube base URL for testing
pub fn mock_base_url(mock_server: &MockServer) -> String {
    mock_server.uri()
}

/// Get a mock SonarQube token for testing
pub fn mock_token() -> String {
    "mock-sonar-token".to_string()
}

/// Get a test project key for testing
pub fn test_project_key() -> String {
    "test-project".to_string()
}
