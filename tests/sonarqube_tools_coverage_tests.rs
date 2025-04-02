//! This file is kept for backward compatibility
//! The actual tests have been moved to src/mcp/sonarqube/tools.rs
//! This file is now just a thin wrapper that re-exports those tests

// Import helpers to maintain compatibility with any tests that might depend on it
mod helpers;

// We don't need to implement the tests again since they've been moved to the module
// These tests ensure that legacy endpoints have test coverage
// Running cargo test will still run the tests from src/mcp/sonarqube/tools.rs
