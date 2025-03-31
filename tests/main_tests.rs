#[cfg(test)]
mod tests {
    use clap::Parser;
    use jsonrpsee_server::RpcModule;
    use jsonrpsee_types::ErrorObject;
    #[cfg(unix)]
    use nix::libc;
    use sonarqube_mcp_server::mcp::utilities::ping;
    use sonarqube_mcp_server::{Args, display_info, setup_signal_handlers};
    use std::env;
    use std::sync::Once;
    #[cfg(windows)]
    use windows_sys::Win32::Foundation::HANDLE;

    static INIT: Once = Once::new();

    fn setup() {
        INIT.call_once(|| {
            // Setup code that should run once for all tests
            unsafe {
                env::set_var("SONARQUBE_URL", "http://localhost:9000");
                env::set_var("SONARQUBE_TOKEN", "dummy-token");
            }
        });
    }

    // Build a simple test router with only essential methods
    fn build_test_router() -> RpcModule<()> {
        let mut router = RpcModule::new(());

        // Register ping method for testing
        router
            .register_async_method("ping", |_, _| async move {
                ping(None).await.map_err(|e| {
                    ErrorObject::owned(-32603, format!("Internal error: {}", e), None::<()>)
                })
            })
            .unwrap();

        router
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

    #[tokio::test]
    async fn test_display_info() {
        // Test resources display
        let args = Args::try_parse_from([
            "test",
            "--resources",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        display_info(&args).await;

        // Test prompts display
        let args = Args::try_parse_from([
            "test",
            "--prompts",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        display_info(&args).await;

        // Test tools display
        let args = Args::try_parse_from([
            "test",
            "--tools",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        display_info(&args).await;

        // Test JSON output
        let args = Args::try_parse_from([
            "test",
            "--resources",
            "--json",
            "--sonarqube-url",
            "http://localhost:9000",
            "--sonarqube-token",
            "dummy-token",
        ])
        .unwrap();
        display_info(&args).await;
    }

    #[test]
    fn test_build_rpc_router() {
        let router = build_test_router();

        // Verify only our test methods are registered
        assert!(router.method("ping").is_some());
    }

    #[tokio::test]
    async fn test_signal_handlers() {
        let running = setup_signal_handlers().await;
        assert!(running.load(std::sync::atomic::Ordering::SeqCst));
    }

    #[cfg(windows)]
    #[ignore]
    #[tokio::test]
    async fn test_signal_handlers_windows() {
        // Just verify we get an AtomicBool back
        let running = setup_signal_handlers().await;
        assert!(running.load(std::sync::atomic::Ordering::SeqCst));
    }
}
