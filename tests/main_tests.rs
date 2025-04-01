#[cfg(test)]
mod tests {
    use clap::Parser;
    use jsonrpsee_server::RpcModule;
    use jsonrpsee_types::ErrorObject;
    use sonarqube_mcp_server::mcp::utilities::*;
    use sonarqube_mcp_server::server::start_server;
    use sonarqube_mcp_server::{Args, display_info, setup_signal_handlers};
    use std::env;
    use std::net::SocketAddr;
    use std::sync::Once;
    use tokio;

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
        RpcModule::new(())
        // No methods need to be registered for this test
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
        let _router = build_test_router();
        // No specific methods to check after ping was removed
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
    async fn test_start_server() {
        let addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
        let server = start_server(addr).await.unwrap();
        // Just assert that we got a valid server handle
        assert!(server.stop().is_ok());
    }
}
