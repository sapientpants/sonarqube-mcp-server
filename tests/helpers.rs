use std::env;
use std::path::Path;
use wiremock::MockServer;

/// Environment variable for the Cargo manifest directory
// Make static private - static CARGO_MANIFEST_DIR: &str = "CARGO_MANIFEST_DIR";

/// Load a JSON fixture file from the tests/fixtures directory
// Make function public again and allow dead code
#[allow(dead_code)]
pub fn load_fixture(name: &str) -> String {
    // Use literal directly as static is removed
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
// Make function public again and allow dead code
#[allow(dead_code)]
pub fn mock_base_url(mock_server: &MockServer) -> String {
    mock_server.uri()
}

/// Get a mock SonarQube token for testing
// Make function public again and allow dead code
#[allow(dead_code)]
pub fn mock_token() -> String {
    "mock-sonar-token".to_string()
}

/// Get a test project key for testing
// Make function public again and allow dead code
#[allow(dead_code)]
pub fn test_project_key() -> String {
    "test-project".to_string()
}
