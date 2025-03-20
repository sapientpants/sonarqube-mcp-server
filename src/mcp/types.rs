use crate::mcp::JSONRPC_VERSION;
use rpc_router::RpcParams;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use url::Url;

#[derive(Debug, Deserialize, Serialize, RpcParams, Clone)]
pub struct InitializeRequest {
    #[serde(rename = "protocolVersion")]
    pub protocol_version: String,
    pub capabilities: ClientCapabilities,
    #[serde(rename = "clientInfo")]
    pub client_info: Implementation,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
#[serde(default)]
pub struct ServerCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experimental: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompts: Option<PromptCapabilities>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resources: Option<ResourceCapabilities>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roots: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sampling: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logging: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct PromptCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct ResourceCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscribe: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
#[serde(default)]
pub struct ClientCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experimental: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roots: Option<RootCapabilities>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sampling: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RootCapabilities {
    pub list_changed: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Implementation {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeResult {
    pub protocol_version: String,
    pub capabilities: ServerCapabilities,
    pub server_info: Implementation,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
}

// --------- resource -------

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct ListResourcesRequest {
    pub cursor: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListResourcesResult {
    pub resources: Vec<Resource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    pub uri: Url,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct ReadResourceRequest {
    pub uri: Url,
    #[serde(rename = "_meta", skip_serializing_if = "Option::is_none")]
    pub meta: Option<MetaParams>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ReadResourceResult {
    pub content: ResourceContent,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceContent {
    pub uri: Url, // The URI of the resource
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>, // Optional MIME type
    pub text: Option<String>, // For text resources
    pub blob: Option<String>, // For binary resources (base64 encoded)
}

// --------- prompt -------
#[derive(Debug, Deserialize, Serialize)]
pub struct Prompt {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Vec<PromptArgument>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PromptArgument {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct ListPromptsRequest {
    pub cursor: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPromptsResult {
    pub prompts: Vec<Prompt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct GetPromptRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<HashMap<String, Value>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PromptResult {
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<PromptMessage>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PromptMessage {
    pub role: String,
    pub content: PromptMessageContent,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PromptMessageContent {
    #[serde(rename = "type")]
    pub type_name: String,
    pub text: String,
}

// --------- tool -------

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tool {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub input_schema: ToolInputSchema,
}

#[derive(Deserialize, Serialize)]
pub struct ToolInputSchema {
    #[serde(rename = "type")]
    pub type_name: String,
    pub properties: HashMap<String, ToolInputSchemaProperty>,
    pub required: Vec<String>,
}

#[derive(Deserialize, Serialize)]
pub struct ToolInputSchemaProperty {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub type_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Deserialize, Serialize, RpcParams)]
pub struct CallToolRequest {
    pub params: ToolCallRequestParams,
    #[serde(rename = "_meta", skip_serializing_if = "Option::is_none")]
    pub meta: Option<MetaParams>,
}

#[derive(Deserialize, Serialize)]
pub struct ToolCallRequestParams {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Value>,
}

#[derive(Deserialize, Serialize, RpcParams)]
#[serde(rename_all = "camelCase")]
pub struct CallToolResult {
    pub content: Vec<CallToolResultContent>,
    pub is_error: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CallToolResultContent {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image")]
    Image { data: String, mime_type: String },
    #[serde(rename = "resource")]
    Resource { resource: ResourceContent },
}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct ListToolsRequest {
    pub cursor: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListToolsResult {
    pub tools: Vec<Tool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

// ----- misc ---
#[derive(Deserialize, Serialize)]
pub struct EmptyResult {}

#[derive(Deserialize, Serialize, RpcParams)]
pub struct PingRequest {}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelledNotification {
    pub request_id: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaParams {
    pub progress_token: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub progress_token: String,
    pub progress: i32,
    pub total: i32,
}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct SetLevelRequest {
    pub level: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LoggingResponse {}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct LoggingMessageNotification {
    pub level: String,
    pub logger: String,
    pub data: Value,
}

#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct ListRootsRequest {}

#[derive(Debug, Deserialize, Serialize)]
pub struct ListRootsResult {
    pub roots: Vec<Root>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Root {
    pub name: String,
    pub url: String,
}

// ----- json-rpc -----
#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Value,
    pub result: Value,
}

impl JsonRpcResponse {
    pub fn new(id: Value, result: Value) -> Self {
        JsonRpcResponse {
            jsonrpc: JSONRPC_VERSION.to_string(),
            id,
            result,
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcNotification {
    pub jsonrpc: String,
    pub method: String,
    pub params: Value,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcError {
    pub jsonrpc: String,
    pub id: Value,
    pub error: Error,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Error {
    pub code: i32,
    pub message: String,
    pub data: Option<Value>,
}

impl JsonRpcError {
    pub fn new(id: Value, code: i32, message: &str) -> Self {
        JsonRpcError {
            jsonrpc: JSONRPC_VERSION.to_string(),
            id,
            error: Error {
                code,
                message: message.to_string(),
                data: None,
            },
        }
    }
}
