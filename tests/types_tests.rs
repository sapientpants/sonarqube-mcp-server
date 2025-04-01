mod helpers;

use serde_json::Value;
use serde_json::json;
use sonarqube_mcp_server::mcp::types::*;
use std::collections::HashMap;
use url::Url;

#[test]
fn test_client_capabilities_serialization() {
    // Create a ClientCapabilities struct
    let capabilities = ClientCapabilities {
        experimental: Some(json!({"feature": "test"})),
        roots: Some(RootCapabilities {
            list_changed: Some(true),
        }),
        sampling: Some(json!({"enabled": true})),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&capabilities).unwrap();

    // Deserialize back to struct
    let deserialized: ClientCapabilities = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(
        deserialized.experimental.unwrap().get("feature").unwrap(),
        "test"
    );
    assert!(deserialized.roots.unwrap().list_changed.unwrap());
    assert_eq!(
        deserialized
            .sampling
            .unwrap()
            .get("enabled")
            .unwrap()
            .as_bool()
            .unwrap(),
        true
    );
}

#[test]
fn test_initialize_result_serialization() {
    // Create an InitializeResult struct
    let result = InitializeResult {
        protocol_version: "1.0".to_string(),
        capabilities: ServerCapabilities {
            text: None,
            experimental: Some(json!({"feature": "test"})),
            prompts: Some(json!({})),
            resources: Some(ResourcesCapabilities {
                get: Some(true),
                list: Some(true),
            }),
            tools: Some(ToolsCapabilities {
                call: Some(true),
                list: Some(true),
            }),
            roots: Some(json!({})),
            sampling: Some(json!({})),
        },
        server_info: Implementation {
            name: "Test Server".to_string(),
            version: "1.0.0".to_string(),
        },
        instructions: Some("Test instructions".to_string()),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&result).unwrap();

    // Deserialize back to struct
    let deserialized: InitializeResult = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.protocol_version, "1.0");
    assert_eq!(
        deserialized
            .capabilities
            .experimental
            .unwrap()
            .get("feature")
            .unwrap(),
        "test"
    );
    assert_eq!(deserialized.server_info.name, "Test Server");
    assert_eq!(deserialized.server_info.version, "1.0.0");
    assert_eq!(deserialized.instructions.unwrap(), "Test instructions");
}

#[test]
fn test_resource_serialization() {
    // Create a Resource struct
    let resource = Resource {
        uri: Url::parse("file:///tmp/test.txt").unwrap(),
        name: "Test Resource".to_string(),
        description: Some("A test resource".to_string()),
        mime_type: Some("text/plain".to_string()),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&resource).unwrap();

    // Deserialize back to struct
    let deserialized: Resource = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.uri.to_string(), "file:///tmp/test.txt");
    assert_eq!(deserialized.name, "Test Resource");
    assert_eq!(deserialized.description.unwrap(), "A test resource");
    assert_eq!(deserialized.mime_type.unwrap(), "text/plain");
}

#[test]
fn test_prompt_serialization() {
    // Create a Prompt struct
    let prompt = Prompt {
        name: "Test Prompt".to_string(),
        description: Some("A test prompt".to_string()),
        messages: Some(vec![]),
        arguments: Some(vec![
            PromptArgument {
                name: "arg1".to_string(),
                description: Some("First argument".to_string()),
                required: Some(true),
            },
            PromptArgument {
                name: "arg2".to_string(),
                description: Some("Second argument".to_string()),
                required: Some(false),
            },
        ]),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&prompt).unwrap();

    // Deserialize back to struct
    let deserialized: Prompt = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.name, "Test Prompt");
    assert_eq!(deserialized.description.unwrap(), "A test prompt");
    assert_eq!(deserialized.arguments.as_ref().unwrap().len(), 2);
    assert_eq!(deserialized.arguments.as_ref().unwrap()[0].name, "arg1");
    assert_eq!(
        deserialized.arguments.as_ref().unwrap()[0]
            .description
            .as_ref()
            .unwrap(),
        "First argument"
    );
    assert_eq!(
        deserialized.arguments.as_ref().unwrap()[0]
            .required
            .unwrap(),
        true
    );
}

#[test]
fn test_tool_serialization() {
    // Create a Tool struct
    let mut properties = HashMap::new();
    properties.insert(
        "param1".to_string(),
        ToolInputSchemaProperty {
            type_name: Some("string".to_string()),
            enum_values: None,
            description: Some("First parameter".to_string()),
        },
    );
    properties.insert(
        "param2".to_string(),
        ToolInputSchemaProperty {
            type_name: Some("number".to_string()),
            enum_values: None,
            description: Some("Second parameter".to_string()),
        },
    );

    let tool = Tool {
        name: "Test Tool".to_string(),
        description: Some("A test tool".to_string()),
        input_schema: ToolInputSchema {
            type_name: "object".to_string(),
            properties,
            required: vec!["param1".to_string()],
        },
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&tool).unwrap();

    // Deserialize back to struct
    let deserialized: Tool = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.name, "Test Tool");
    assert_eq!(deserialized.description.unwrap(), "A test tool");
    assert_eq!(deserialized.input_schema.type_name, "object");
    assert_eq!(deserialized.input_schema.required.len(), 1);
    assert_eq!(deserialized.input_schema.required[0], "param1");
    assert_eq!(deserialized.input_schema.properties.len(), 2);
    assert_eq!(
        deserialized
            .input_schema
            .properties
            .get("param1")
            .unwrap()
            .type_name
            .as_ref()
            .unwrap(),
        "string"
    );
}

#[test]
fn test_call_tool_result_content_serialization() {
    // Test Text variant
    let text_content = CallToolResultContent::Text {
        text: "Test text".to_string(),
    };
    let json_str = serde_json::to_string(&text_content).unwrap();
    let deserialized: CallToolResultContent = serde_json::from_str(&json_str).unwrap();
    match deserialized {
        CallToolResultContent::Text { text } => assert_eq!(text, "Test text"),
        _ => panic!("Expected Text variant"),
    }

    // Test Image variant
    let image_content = CallToolResultContent::Image {
        data: b"base64data".to_vec(),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&image_content).unwrap();

    // Deserialize back to struct
    let deserialized: CallToolResultContent = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    match deserialized {
        CallToolResultContent::Image { data } => {
            assert_eq!(data, b"base64data".to_vec());
        }
        _ => panic!("Wrong variant"),
    }

    // Test Resource variant
    let resource_content = CallToolResultContent::Resource {
        resource: ResourceContent::Text {
            text: "Test text".to_string(),
        },
    };
    let json_str = serde_json::to_string(&resource_content).unwrap();
    let deserialized: CallToolResultContent = serde_json::from_str(&json_str).unwrap();
    match deserialized {
        CallToolResultContent::Resource { resource } => match resource {
            ResourceContent::Text { text } => assert_eq!(text, "Test text"),
            _ => panic!("Expected ResourceContent::Text variant"),
        },
        _ => panic!("Expected Resource variant"),
    }
}

#[test]
fn test_json_rpc_response_serialization() {
    // Create a JsonRpcResponse
    let response = JsonRpcResponse::new(json!(1), json!({"success": true}));

    // Verify values
    assert_eq!(response.jsonrpc, "2.0");
    assert_eq!(response.id, json!(1));
    assert_eq!(response.result.get("success").unwrap(), &json!(true));

    // Serialize to JSON
    let json_str = serde_json::to_string(&response).unwrap();

    // Deserialize back to struct
    let deserialized: JsonRpcResponse = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.jsonrpc, "2.0");
    assert_eq!(deserialized.id, json!(1));
    assert_eq!(deserialized.result.get("success").unwrap(), &json!(true));
}

#[test]
fn test_json_rpc_error_serialization() {
    // Create a JsonRpcError
    let error = JsonRpcError::new(json!(1), -32601, "Method not found");

    // Verify values
    assert_eq!(error.jsonrpc, "2.0");
    assert_eq!(error.id, json!(1));
    assert_eq!(error.error.code, -32601);
    assert_eq!(error.error.message, "Method not found");
    assert!(error.error.data.is_none());

    // Serialize to JSON
    let json_str = serde_json::to_string(&error).unwrap();

    // Deserialize back to struct
    let deserialized: JsonRpcError = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.jsonrpc, "2.0");
    assert_eq!(deserialized.id, json!(1));
    assert_eq!(deserialized.error.code, -32601);
    assert_eq!(deserialized.error.message, "Method not found");
    assert!(deserialized.error.data.is_none());
}

#[test]
fn test_jsonrpc_types() {
    let response = JsonRpcResponse::new(Value::from(1), Value::from("ok"));
    assert_eq!(response.id, Value::from(1));
    let error = JsonRpcError::new(Value::from(1), -32000, "fail");
    assert_eq!(error.error.code, -32000);
}
