#[cfg(test)]
mod tests {
    use chrono;
    use std::fs;
    use std::io::Write;

    #[test]
    fn test_log_file_creation() {
        // Get temp directory
        let log_dir = std::env::temp_dir();
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
        let log_path = log_dir.join(format!("sonarqube_mcp_server_{}.log", timestamp));

        // Create log file
        let file = std::fs::File::create(&log_path);
        assert!(file.is_ok());

        // Verify file exists
        assert!(log_path.exists());

        // Clean up
        fs::remove_file(log_path).unwrap();
    }

    #[test]
    fn test_log_file_writing() {
        // Setup test log file
        let log_dir = std::env::temp_dir();
        let test_log = log_dir.join("test_sonarqube_mcp.log");
        let mut file = std::fs::File::create(&test_log).unwrap();

        // Test writing JSON-RPC message
        let test_message = r#"{"jsonrpc": "2.0", "method": "test", "params": {}}"#;
        writeln!(file, "{}", test_message).unwrap();

        // Test writing response
        let test_response = r#"{"jsonrpc": "2.0", "result": "success", "id": 1}"#;
        writeln!(file, "{}", test_response).unwrap();

        // Verify contents
        let contents = fs::read_to_string(&test_log).unwrap();
        assert!(contents.contains("test"));
        assert!(contents.contains("success"));

        // Clean up
        fs::remove_file(test_log).unwrap();
    }

    #[test]
    fn test_log_file_append() {
        // Setup test log file
        let log_dir = std::env::temp_dir();
        let test_log = log_dir.join("test_append_sonarqube_mcp.log");

        // Create initial content
        {
            let mut file = std::fs::File::create(&test_log).unwrap();
            writeln!(file, "Initial log entry").unwrap();
        }

        // Append new content
        {
            let mut file = std::fs::OpenOptions::new()
                .append(true)
                .open(&test_log)
                .unwrap();
            writeln!(file, "Appended log entry").unwrap();
        }

        // Verify both entries exist
        let contents = fs::read_to_string(&test_log).unwrap();
        assert!(contents.contains("Initial log entry"));
        assert!(contents.contains("Appended log entry"));

        // Clean up
        fs::remove_file(test_log).unwrap();
    }

    #[test]
    fn test_log_file_permissions() {
        // Setup test log file
        let log_dir = std::env::temp_dir();
        let test_log = log_dir.join("test_perms_sonarqube_mcp.log");
        let file = std::fs::File::create(&test_log).unwrap();

        // Verify file permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = file.metadata().unwrap();
            let permissions = metadata.permissions();
            // Check if file is readable and writable by owner
            assert!(permissions.mode() & 0o600 == 0o600);
        }

        // Clean up
        drop(file);
        fs::remove_file(test_log).unwrap();
    }
}
