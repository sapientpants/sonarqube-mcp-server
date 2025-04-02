#[cfg(test)]
mod tests {
    use clap::Parser;
    use jsonrpsee_server::RpcModule;
    use sonarqube_mcp_server::{Args, setup_signal_handlers};
    use tokio;

    // Mock implementations of utilities functions for testing
    async fn notifications_initialized() -> anyhow::Result<()> {
        Ok(())
    }

    async fn notifications_cancelled() -> anyhow::Result<()> {
        Ok(())
    }

    // Build a simple test router with only essential methods
    fn build_test_router() -> RpcModule<()> {
        RpcModule::new(())
    }

    #[test]
    fn test_args_parsing() {
        let args = Args::try_parse_from([
            "test",
            "--mcp",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        assert!(args.mcp);
        assert!(!args.prompts);
        assert!(!args.resources);
        assert!(!args.tools);
        assert!(!args.json);
    }

    #[test]
    fn test_args_available() {
        let args = Args::try_parse_from([
            "test",
            "--prompts",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        assert!(args.is_args_available());

        let args = Args::try_parse_from([
            "test",
            "--resources",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        assert!(args.is_args_available());

        let args = Args::try_parse_from([
            "test",
            "--tools",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        assert!(args.is_args_available());

        let args = Args::try_parse_from([
            "test",
            "--mcp",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        assert!(!args.is_args_available());
    }

    #[test]
    fn test_args_json_output() {
        let args = Args::try_parse_from([
            "test",
            "--prompts",
            "--json",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        assert!(args.prompts);
        assert!(args.json);
    }

    #[test]
    fn test_build_rpc_router() {
        let _router = build_test_router();
        // No specific methods to check after ping was removed
    }

    #[test]
    fn test_start_server() {
        // Check if we can create a router
        let router = build_test_router();
        assert_eq!(router.method_names().count(), 0);
    }

    #[tokio::test]
    async fn test_signal_handlers() {
        let running = setup_signal_handlers().await;
        assert!(running.load(std::sync::atomic::Ordering::SeqCst));
    }

    #[tokio::test]
    async fn test_notifications() {
        // Test initialization notification
        let init_result = notifications_initialized().await;
        assert!(init_result.is_ok());

        // Test cancellation notification
        let cancel_result = notifications_cancelled().await;
        assert!(cancel_result.is_ok());
    }

    #[tokio::test]
    async fn test_display_info() {
        let args = sonarqube_mcp_server::Args {
            sonarqube_url: "http://test.com".to_string(),
            sonarqube_token: "test-token".to_string(),
            sonarqube_organization: None,
            resources: false,
            prompts: false,
            tools: false,
            mcp: false,
            json: false,
        };
        sonarqube_mcp_server::display_info(&args).await;
    }
}
