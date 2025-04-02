use sonarqube_mcp_server::mcp::config::{Config, LoggingConfig, ServerConfig, SonarQubeConfig};
use std::env;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_config_default() {
    let config = Config::default_config();
    assert!(config.sonarqube.url.is_empty());
    assert!(config.sonarqube.token.is_empty());
    assert_eq!(config.sonarqube.organization, None);
    assert_eq!(config.server.host, "127.0.0.1");
    assert_eq!(config.server.port, 9000);
}

#[test]
fn test_config_validation() {
    // Invalid config - missing URL
    let mut config = Config::default_config();
    config.sonarqube.token = "test-token".to_string();
    assert!(config.validate().is_err());

    // Invalid config - missing token
    let mut config = Config::default_config();
    config.sonarqube.url = "http://example.com".to_string();
    assert!(config.validate().is_err());

    // Invalid config - invalid port
    let mut config = Config::default_config();
    config.sonarqube.url = "http://example.com".to_string();
    config.sonarqube.token = "test-token".to_string();
    config.server.port = 0;
    assert!(config.validate().is_err());

    // Valid config
    let mut config = Config::default_config();
    config.sonarqube.url = "http://example.com".to_string();
    config.sonarqube.token = "test-token".to_string();
    assert!(config.validate().is_ok());
}

#[test]
fn test_config_file_roundtrip() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("test-config.toml");

    // Create a sample configuration
    let config = Config {
        sonarqube: SonarQubeConfig {
            url: "https://sonarqube.example.com".to_string(),
            token: "test-token".to_string(),
            organization: Some("test-org".to_string()),
            debug: Some(true),
        },
        server: ServerConfig {
            host: "0.0.0.0".to_string(),
            port: 8080,
            max_connections: 200,
            timeout_seconds: 60,
        },
        logging: LoggingConfig {
            level: "debug".to_string(),
            file: Some("/var/log/sonarqube-mcp.log".to_string()),
            stdout: true,
            json_format: true,
        },
        custom: None,
    };

    // Save it to a file
    config.save_to_file(&config_path).unwrap();

    // Check that the file exists
    assert!(config_path.exists());

    // Read the file content to verify
    let content = fs::read_to_string(&config_path).unwrap();
    assert!(content.contains("https://sonarqube.example.com"));
    assert!(content.contains("test-token"));
    assert!(content.contains("test-org"));
    assert!(content.contains("0.0.0.0"));
    assert!(content.contains("8080"));

    // Load it back
    let loaded_config = Config::load_from_file(&config_path).unwrap();

    // Verify it matches the original
    assert_eq!(loaded_config.sonarqube.url, config.sonarqube.url);
    assert_eq!(loaded_config.sonarqube.token, config.sonarqube.token);
    assert_eq!(
        loaded_config.sonarqube.organization,
        config.sonarqube.organization
    );
    assert_eq!(loaded_config.sonarqube.debug, config.sonarqube.debug);
    assert_eq!(loaded_config.server.host, config.server.host);
    assert_eq!(loaded_config.server.port, config.server.port);
    assert_eq!(
        loaded_config.server.max_connections,
        config.server.max_connections
    );
    assert_eq!(loaded_config.logging.level, config.logging.level);
    assert_eq!(loaded_config.logging.file, config.logging.file);
    assert_eq!(
        loaded_config.logging.json_format,
        config.logging.json_format
    );
}

#[test]
fn test_env_vars_override() {
    // Set up temporary environment variables
    unsafe {
        env::set_var("SONARQUBE_URL", "https://env.example.com");
        env::set_var("SONARQUBE_TOKEN", "env-token");
        env::set_var("SONARQUBE_ORGANIZATION", "env-org");
        env::set_var("SONARQUBE_MCP_PORT", "7777");
    }

    // Create a config with defaults
    let mut config = Config::default_config();

    // Apply environment variables
    config = Config::apply_env_vars(config).unwrap();

    // Verify environment variables were applied
    assert_eq!(config.sonarqube.url, "https://env.example.com");
    assert_eq!(config.sonarqube.token, "env-token");
    assert_eq!(config.sonarqube.organization, Some("env-org".to_string()));
    assert_eq!(config.server.port, 7777);

    // Clean up
    unsafe {
        env::remove_var("SONARQUBE_URL");
        env::remove_var("SONARQUBE_TOKEN");
        env::remove_var("SONARQUBE_ORGANIZATION");
        env::remove_var("SONARQUBE_MCP_PORT");
    }
}

#[test]
fn test_to_sonarqube_config() {
    let config = Config {
        sonarqube: SonarQubeConfig {
            url: "https://sonarqube.example.com".to_string(),
            token: "test-token".to_string(),
            organization: Some("test-org".to_string()),
            debug: Some(true),
        },
        server: ServerConfig::default(),
        logging: LoggingConfig::default(),
        custom: None,
    };

    let sonarqube_config = config.to_sonarqube_config();

    assert_eq!(sonarqube_config.base_url, "https://sonarqube.example.com");
    assert_eq!(sonarqube_config.token, "test-token");
    assert_eq!(sonarqube_config.organization, Some("test-org".to_string()));
}
