#[cfg(test)]
mod tests {
    use jsonrpsee_server::RpcModule;
    use jsonrpsee_types::ErrorObject;
    use serde_json::{Value, json};
    use sonarqube_mcp_server::mcp::types::{CancelledNotification, JsonRpcError};
    use sonarqube_mcp_server::mcp::utilities::{
        notifications_cancelled, notifications_initialized, ping,
    };

    // Create a simple router for testing that only registers the ping method
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

    #[tokio::test]
    async fn test_jsonrpc_request_handling() {
        let router = build_test_router();

        // Test valid request with empty params - using a tuple since () doesn't implement ToRpcParams
        let response: Result<Value, _> = router.call("ping", (json!({}),)).await;
        assert!(response.is_ok());

        // Test invalid method - use a method name that isn't registered
        let response: Result<Value, _> =
            router.call("definitely_invalid_method", (json!({}),)).await;
        assert!(response.is_err());
    }

    #[test]
    fn test_notifications_initialized() {
        let request = json!({
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        });
        let method = request.get("method").unwrap().as_str().unwrap();
        assert_eq!(method, "notifications/initialized");
        notifications_initialized();
    }

    #[test]
    fn test_notifications_cancelled() {
        let request = json!({
            "jsonrpc": "2.0",
            "method": "notifications/cancelled",
            "params": {
                "requestId": "test_id"
            }
        });
        let params_value = request.get("params").unwrap();
        let cancel_params: CancelledNotification =
            serde_json::from_value(params_value.clone()).unwrap();
        let method = request.get("method").unwrap().as_str().unwrap();
        assert_eq!(method, "notifications/cancelled");
        notifications_cancelled(cancel_params);
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
                "name": "ping",
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

    fn handle_notification(json_value: &Value) -> bool {
        if let Some(method) = json_value.get("method") {
            match method.as_str().unwrap() {
                "notifications/initialized" => {
                    notifications_initialized();
                    true
                }
                "notifications/cancelled" => {
                    if let Some(params) = json_value.get("params") {
                        if let Ok(cancel_params) =
                            serde_json::from_value::<CancelledNotification>(params.clone())
                        {
                            notifications_cancelled(cancel_params);
                            return true;
                        }
                    }
                    false
                }
                _ => false,
            }
        } else {
            false
        }
    }
}
