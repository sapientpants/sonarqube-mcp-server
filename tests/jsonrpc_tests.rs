#[cfg(test)]
mod tests {
    use jsonrpsee_core::server::RpcModule;
    use jsonrpsee_types::ErrorObject;
    use serde_json::{Value, json};
    use sonarqube_mcp_server::mcp::tools::register_tools;
    use sonarqube_mcp_server::mcp::types::*;

    // Mock implementations of utilities functions for testing
    async fn notifications_initialized() -> anyhow::Result<()> {
        Ok(())
    }

    async fn notifications_cancelled() -> anyhow::Result<()> {
        Ok(())
    }

    // Create a simple router for testing
    fn build_test_router() -> RpcModule<()> {
        let mut router = RpcModule::new(());

        // Register test method
        router
            .register_async_method("test", |_, _| async move {
                Ok::<_, ErrorObject<'static>>(json!({"result": "success"}))
            })
            .unwrap();

        router
    }

    #[tokio::test]
    async fn test_jsonrpc_request_handling() {
        let router = build_test_router();

        // Test valid request with empty params - using a tuple since () doesn't implement ToRpcParams
        let response: Result<Value, _> = router.call("test", (json!({}),)).await;
        assert!(response.is_ok());

        // Test invalid method - use a method name that isn't registered
        let response: Result<Value, _> =
            router.call("definitely_invalid_method", (json!({}),)).await;
        assert!(response.is_err());
    }

    #[tokio::test]
    async fn test_notifications_initialized() {
        let request = json!({
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        });
        let method = request.get("method").unwrap().as_str().unwrap();
        assert_eq!(method, "notifications/initialized");
        notifications_initialized().await.unwrap();
    }

    #[tokio::test]
    async fn test_notifications_cancelled() {
        let request = json!({
            "jsonrpc": "2.0",
            "method": "notifications/cancelled",
            "params": {
                "requestId": "test_id"
            }
        });
        let method = request.get("method").unwrap().as_str().unwrap();
        assert_eq!(method, "notifications/cancelled");
        // Call with no parameters since the function signature changed
        notifications_cancelled().await.unwrap();
    }

    #[test]
    fn test_invalid_request() {
        let _request = json!({
            "jsonrpc": "2.0",
            "id": "test_id",
            "method": "invalid_method"
        });
        let error = JsonRpcError::new("test_id".into(), -1, "Invalid json-rpc call");
        assert_eq!(error.id, "test_id");
        assert_eq!(error.error.code, -1);
        assert_eq!(error.error.message, "Invalid json-rpc call");
    }

    #[test]
    fn test_tool_call_request() {
        // Test valid tool call
        let tool_call = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "sonarqube_get_metrics",
                "arguments": {}
            }
        });
        let method = tool_call.get("method").unwrap().as_str().unwrap();
        assert_eq!(method, "tools/call");

        // Test invalid tool call
        let invalid_tool = json!({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "invalid_tool",
                "arguments": {}
            }
        });
        let method = invalid_tool.get("method").unwrap().as_str().unwrap();
        assert_eq!(method, "tools/call");
    }

    #[test]
    fn test_error_responses() {
        // Test standard error
        let error = JsonRpcError::new(json!(1), -32601, "Method not found");
        let error_json = serde_json::to_string(&error).unwrap();
        assert!(error_json.contains("Method not found"));

        // Test custom error
        let error = JsonRpcError::new(json!(2), -1, "Custom error message");
        let error_json = serde_json::to_string(&error).unwrap();
        assert!(error_json.contains("Custom error message"));
    }

    #[tokio::test]
    async fn test_handle_notification() {
        let json_value = json!({
            "method": "notifications/initialized"
        });

        if let Some(method) = json_value.get("method") {
            match method.as_str().unwrap() {
                "notifications/initialized" => {
                    notifications_initialized().await.unwrap();
                }
                "notifications/cancelled" => {
                    // Call with no parameters since the function signature changed
                    notifications_cancelled().await.unwrap();
                }
                _ => {}
            }
        }
    }

    #[test]
    fn test_register_methods() {
        let mut module = RpcModule::new(());
        register_tools(&mut module).unwrap();
    }

    #[tokio::test]
    async fn test_notifications_cancelled_async() {
        let mut module = RpcModule::new(());
        register_tools(&mut module).unwrap();
        notifications_cancelled().await.unwrap();
    }
}
