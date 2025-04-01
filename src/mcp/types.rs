use crate::mcp::JSONRPC_VERSION;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use url::Url;

/// Core type definitions for the MCP server.
///
/// This module defines the data structures used throughout the MCP server implementation,
/// including:
///
/// - JSON-RPC protocol types for request/response handling
/// - Initialization and capability negotiation types
/// - Resource management structures
/// - Tool definitions and invocation types
/// - Logging and utility structures
///
/// These types form the backbone of the server's communication with MCP clients
/// and provide the necessary structures for implementing the MCP specification.
/// Parameters for initializing a client connection
///
/// This structure contains the information needed to establish a connection
/// between a client and the MCP server, including protocol version,
/// capabilities, and client implementation details.
#[derive(Debug, Deserialize, Serialize)]
pub struct InitializeRequest {
    /// Protocol version the client implements
    #[serde(rename = "protocolVersion")]
    pub protocol_version: String,
    /// Capabilities that the client supports
    pub capabilities: ClientCapabilities,
    /// Information about the client implementation
    #[serde(rename = "clientInfo")]
    pub client_info: Implementation,
}

// --------- capabilities / inits -------

/// Server capabilities configuration
///
/// This structure defines the capabilities that the server supports and can
/// expose to clients, including text handling, resources, tools, and other
/// experimental features.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerCapabilities {
    /// Configuration for text-related capabilities
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<Value>,
    /// Experimental capabilities not yet standardized
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experimental: Option<Value>,
    /// Resources capabilities configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resources: Option<ResourcesCapabilities>,
    /// Tool-related capabilities configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<ToolsCapabilities>,
    /// Sampling configuration for telemetry
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sampling: Option<Value>,
    /// Prompt-related capabilities configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompts: Option<Value>,
    /// Root directory capabilities
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roots: Option<Value>,
}

/// Project representation in MCP
///
/// Contains information about a project in the system, typically used
/// when listing available projects.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    /// Name of the project
    pub name: String,
    /// Unique key identifying the project
    pub key: String,
}

/// Empty result type
///
/// Used for operations that don't need to return any data but need to
/// indicate successful completion.
#[derive(Debug, Serialize, Deserialize)]
pub struct EmptyResult {}

/// Ping request type
///
/// Used for health check requests to verify server availability.
#[derive(Debug, Serialize, Deserialize)]
pub struct PingRequest {}

/// Logging response type
///
/// Used to acknowledge logging-related operations.
#[derive(Debug, Serialize, Deserialize)]
pub struct LoggingResponse {}

/// Request to list available root directories
///
/// Used to request a list of all root directories accessible to the server.
#[derive(Debug, Serialize, Deserialize)]
pub struct ListRootsRequest {}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourcesCapabilities {
    /// Whether the server supports getting resources
    #[serde(skip_serializing_if = "Option::is_none")]
    pub get: Option<bool>,
    /// Whether the server supports listing resources
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolsCapabilities {
    /// Whether the server supports invoking tools
    #[serde(skip_serializing_if = "Option::is_none")]
    pub call: Option<bool>,
    /// Whether the server supports listing available tools
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list: Option<bool>,
}

/// Client capabilities communicated during initialization
///
/// This struct represents the capabilities that a client supports,
/// which are communicated to the server during the initialization phase.
/// These capabilities help the server determine what features it can
/// expose to this particular client.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct ClientCapabilities {
    /// Experimental capabilities not yet standardized
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experimental: Option<Value>,
    /// Configuration for root directory capabilities
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roots: Option<RootCapabilities>,
    /// Sampling configuration for telemetry
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sampling: Option<Value>,
}

/// Root directory capabilities configuration
///
/// Specifies capabilities related to root directory handling,
/// such as whether the client can handle notifications about
/// changes to the list of available roots.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RootCapabilities {
    /// Whether the client should be notified when the list of roots changes
    pub list_changed: Option<bool>,
}

/// Server or client implementation details
///
/// Contains metadata about the implementation of either the MCP server
/// or client, including its name and version number.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Implementation {
    /// Name of the implementation (e.g., "sonarqube-mcp-server")
    pub name: String,
    /// Version of the implementation (e.g., "0.2.0")
    pub version: String,
}

/// Result returned after successful client initialization
///
/// This structure is sent to the client after a successful initialization
/// request, providing information about the server's capabilities,
/// version, and other important metadata.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeResult {
    /// The MCP protocol version this server implements
    pub protocol_version: String,
    /// The specific capabilities supported by this server
    pub capabilities: ServerCapabilities,
    /// Metadata about the server implementation
    pub server_info: Implementation,
    /// Optional instructions for using this server
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
}

// --------- resource -------

/// Request parameters for listing available resources
///
/// This structure defines the parameters for requesting a list of
/// resources from the MCP server. It supports pagination through
/// the optional cursor parameter.
#[derive(Debug, Deserialize, Serialize)]
pub struct ListResourcesRequest {
    /// Optional cursor for pagination when fetching multiple pages of resources
    pub cursor: Option<String>,
}

/// Result containing a list of available resources
///
/// This structure contains the response for a resources/list request,
/// including a collection of resources and optional pagination information
/// for fetching subsequent pages.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListResourcesResult {
    /// Collection of resources available from the server
    pub resources: Vec<Resource>,
    /// Optional cursor for fetching the next page of resources
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Metadata for an individual resource
///
/// This structure represents a single resource available from the MCP server,
/// including its identification, descriptive information, and content type.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    /// URI uniquely identifying this resource
    pub uri: Url,
    /// Display name of the resource
    pub name: String,
    /// Optional description of the resource's contents or purpose
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// MIME type of the resource content (e.g., "text/markdown", "application/json")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

/// Request parameters for reading a specific resource
///
/// This structure defines the parameters for requesting the content of
/// a specific resource from the MCP server.
#[derive(Debug, Deserialize, Serialize)]
pub struct ReadResourceRequest {
    /// URI of the resource to retrieve
    pub uri: Url,
    /// Optional metadata for the request, such as progress tracking information
    #[serde(rename = "_meta", skip_serializing_if = "Option::is_none")]
    pub meta: Option<MetaParams>,
}

/// Result containing the content of a requested resource
///
/// This structure contains the response for a resources/read request,
/// with the actual content of the requested resource.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ReadResourceResult {
    /// Content of the requested resource
    pub content: ResourceContent,
}

/// Content of a resource with its type information
///
/// This enum represents different types of resource content that
/// can be returned by the MCP server, including text and binary data.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub enum ResourceContent {
    /// Textual resource content
    #[serde(rename = "text")]
    Text { text: String },
    /// Binary resource content (base64-encoded)
    #[serde(rename = "binary")]
    Binary { data: Vec<u8> },
}

// --------- prompt -------

/// Metadata for an individual prompt
///
/// This structure represents a prompt available from the MCP server,
/// including its name, description, and optional argument definitions.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Prompt {
    /// Unique name identifier for the prompt
    pub name: String,
    /// Optional description of the prompt's purpose or usage
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Optional list of arguments that this prompt can accept
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Vec<PromptArgument>>,
    /// Optional collection of messages associated with the prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<PromptMessage>>,
}

/// Definition of an argument for a prompt
///
/// This structure defines a single argument that can be provided to a
/// prompt, including information about its name, description, and
/// whether it's required.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PromptArgument {
    /// Name of the argument
    pub name: String,
    /// Optional description of the argument's purpose
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Whether this argument is required (if not specified, defaults to optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
}

/// Request parameters for listing available prompts
///
/// This structure defines the parameters for requesting a list of
/// prompts from the MCP server, supporting pagination through
/// the optional cursor parameter.
#[derive(Debug, Deserialize, Serialize)]
pub struct ListPromptsRequest {
    /// Optional cursor for pagination when fetching multiple pages of prompts
    pub cursor: Option<String>,
}

/// Result containing a list of available prompts
///
/// This structure contains the response for a prompts/list request,
/// including a collection of prompts and optional pagination information
/// for fetching subsequent pages.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListPromptsResult {
    /// Collection of prompts available from the server
    pub prompts: Vec<Prompt>,
    /// Optional cursor for fetching the next page of prompts
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Request parameters for getting a specific prompt
///
/// This structure defines the parameters for requesting a specific
/// prompt from the MCP server by its name, optionally providing
/// values for the prompt's arguments.
#[derive(Debug, Deserialize, Serialize)]
pub struct GetPromptRequest {
    /// Name of the prompt to retrieve
    pub name: String,
    /// Optional map of argument values to provide to the prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<HashMap<String, Value>>,
}

/// Result containing the contents of a requested prompt
///
/// This structure contains the response for a prompts/get request,
/// with the prompt's description and optional message content.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PromptResult {
    /// Description of the prompt's purpose or content
    pub description: String,
    /// Optional collection of messages associated with the prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<PromptMessage>>,
}

/// Message component of a prompt
///
/// This structure represents a message within a prompt, with a role
/// (like "system", "user", or "assistant") and content.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PromptMessage {
    /// Role of the message sender (e.g., "system", "user", "assistant")
    pub role: String,
    /// Content of the message
    pub content: PromptMessageContent,
}

/// Content of a prompt message
///
/// This structure represents the content of a message within a prompt,
/// specifying its type and text.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PromptMessageContent {
    /// Type of the message content (typically "text")
    #[serde(rename = "type")]
    pub type_name: String,
    /// Actual text content of the message
    pub text: String,
}

// --------- tool -------

/// Definition of a tool available in the MCP server
///
/// This structure represents a tool that clients can call, including
/// its name, description, and expected input parameters schema.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tool {
    /// Unique name identifier for the tool
    pub name: String,
    /// Optional description of the tool's purpose or functionality
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Schema describing the expected input parameters for the tool
    pub input_schema: ToolInputSchema,
}

/// JSON Schema definition for a tool's input
///
/// This structure defines the expected input format for a tool,
/// using a simplified JSON Schema format to describe the properties
/// and required fields.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ToolInputSchema {
    /// Type of the top-level schema (typically "object")
    #[serde(rename = "type")]
    pub type_name: String,
    /// Map of property names to their schema definitions
    pub properties: HashMap<String, ToolInputSchemaProperty>,
    /// List of property names that are required
    pub required: Vec<String>,
}

/// Schema definition for a single property in a tool's input
///
/// This structure defines the schema for a single property within
/// a tool's input parameters, including its type, possible values,
/// and description.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ToolInputSchemaProperty {
    /// Type of the property (e.g., "string", "number", "boolean")
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub type_name: Option<String>,
    /// For enum properties, the list of possible values
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<String>>,
    /// Description of the property's purpose or expected format
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Request parameters for calling a tool
///
/// This structure defines the parameters for invoking a tool on the
/// MCP server, including the tool name, arguments, and optional
/// progress tracking metadata.
#[derive(Debug, Deserialize, Serialize)]
pub struct CallToolRequest {
    /// Parameters for the tool call
    pub params: ToolCallRequestParams,
    /// Optional metadata for tracking progress of long-running operations
    #[serde(rename = "_meta", skip_serializing_if = "Option::is_none")]
    pub meta: Option<MetaParams>,
}

/// Parameters for a tool call request
///
/// This structure contains the specific parameters needed to invoke
/// a tool, including its name and optional arguments.
#[derive(Debug, Deserialize, Serialize)]
pub struct ToolCallRequestParams {
    /// Name of the tool to call
    pub name: String,
    /// Optional arguments to provide to the tool
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Value>,
}

/// Result of a tool call operation
///
/// This structure represents the response for a tools/call request,
/// containing the content returned by the tool and an indication of
/// whether the operation resulted in an error.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CallToolResult {
    /// Content returned by the tool
    pub content: Vec<CallToolResultContent>,
    /// Whether the tool call resulted in an error
    pub is_error: bool,
}

/// Content returned by a tool
///
/// This enum represents the different types of content that can be
/// returned by a tool, including text, images, and resource references.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(tag = "type")]
pub enum CallToolResultContent {
    /// Textual content returned by the tool
    #[serde(rename = "text")]
    Text { text: String },
    /// Image content returned by the tool (base64-encoded)
    #[serde(rename = "image")]
    Image { data: Vec<u8> },
    /// Resource reference returned by the tool
    #[serde(rename = "resource")]
    Resource { resource: ResourceContent },
}

/// Request parameters for listing available tools
///
/// This structure defines the parameters for requesting a list of
/// tools from the MCP server, supporting pagination through
/// the optional cursor parameter.
#[derive(Debug, Deserialize, Serialize)]
pub struct ListToolsRequest {
    /// Optional cursor for pagination when fetching multiple pages of tools
    pub cursor: Option<String>,
}

/// Result containing a list of available tools
///
/// This structure contains the response for a tools/list request,
/// including a collection of tools and optional pagination information
/// for fetching subsequent pages.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListToolsResult {
    /// Collection of tools available from the server
    pub tools: Vec<Tool>,
    /// Optional cursor for fetching the next page of tools
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

// ----- misc ---

/// Notification that a request has been cancelled
///
/// This structure represents a notification sent to inform that
/// a particular request has been cancelled, optionally including
/// a reason for the cancellation.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelledNotification {
    /// ID of the request that was cancelled
    pub request_id: String,
    /// Optional reason for the cancellation
    pub reason: Option<String>,
}

/// Parameters for tracking progress of operations
///
/// This structure contains metadata used for tracking the progress
/// of long-running operations, allowing clients to identify and
/// monitor specific operations.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaParams {
    /// Token identifying the operation for progress tracking
    pub progress_token: String,
}

/// Progress information for a long-running operation
///
/// This structure represents a progress update for a long-running
/// operation, providing information about how much of the operation
/// has been completed.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    /// Token identifying the operation this progress relates to
    pub progress_token: String,
    /// Current progress value (e.g., number of items processed)
    pub progress: i32,
    /// Total expected work (e.g., total number of items to process)
    pub total: i32,
}

/// Request parameters for setting logging level
///
/// This structure defines the parameters for setting the logging
/// level on the server, allowing clients to control how verbose
/// the server's logging output is.
#[derive(Debug, Deserialize, Serialize)]
pub struct SetLevelRequest {
    /// Logging level to set (e.g., "debug", "info", "warn", "error")
    pub level: String,
}

/// Notification containing a logging message
///
/// This structure represents a notification containing a log
/// message from the server, including its level, source, and data.
#[derive(Debug, Deserialize, Serialize)]
pub struct LoggingMessageNotification {
    /// Level of the log message (e.g., "debug", "info", "warn", "error")
    pub level: String,
    /// Source logger that generated the message
    pub logger: String,
    /// Data/content of the log message
    pub data: Value,
}

/// Request parameters for listing root directories
///
/// This structure contains the response for a roots/list request,
/// including a collection of available root directories.
#[derive(Debug, Deserialize, Serialize)]
pub struct ListRootsResult {
    /// Collection of root directories available from the server
    pub roots: Vec<Root>,
}

/// Metadata for a root directory
///
/// This structure represents a single root directory available
/// from the MCP server, including its name and URL.
#[derive(Debug, Deserialize, Serialize)]
pub struct Root {
    /// Display name of the root directory
    pub name: String,
    /// URL where the root directory can be accessed
    pub url: String,
}

// ----- json-rpc -----

/// Standard JSON-RPC response
///
/// This structure represents a standard JSON-RPC response containing
/// the protocol version, request ID, and result data.
#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcResponse {
    /// JSON-RPC protocol version (typically "2.0")
    pub jsonrpc: String,
    /// ID matching the request this response is for
    pub id: Value,
    /// Result data returned for the request
    pub result: Value,
}

impl JsonRpcResponse {
    /// Creates a new JSON-RPC response.
    ///
    /// # Arguments
    ///
    /// * `id` - The ID of the request this response is for
    /// * `result` - The result data to include in the response
    ///
    /// # Returns
    ///
    /// Returns a new `JsonRpcResponse` instance with the specified ID and result,
    /// using the standard JSON-RPC version.
    #[allow(dead_code)]
    pub fn new(id: Value, result: Value) -> Self {
        JsonRpcResponse {
            jsonrpc: JSONRPC_VERSION.to_string(),
            id,
            result,
        }
    }
}

/// Standard JSON-RPC notification
///
/// This structure represents a JSON-RPC notification (a message
/// that doesn't require a response), containing the protocol version,
/// method name, and parameters.
#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcNotification {
    /// JSON-RPC protocol version (typically "2.0")
    pub jsonrpc: String,
    /// Method name for the notification
    pub method: String,
    /// Parameters for the notification
    pub params: Value,
}

/// Standard JSON-RPC error response
///
/// This structure represents a JSON-RPC error response containing
/// the protocol version, request ID, and error information.
#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcError {
    /// JSON-RPC protocol version (typically "2.0")
    pub jsonrpc: String,
    /// ID matching the request this error is for
    pub id: Value,
    /// Error information
    pub error: Error,
}

/// JSON-RPC error details
///
/// This structure contains the details of an error that occurred
/// during the processing of a JSON-RPC request, including its
/// code, message, and optional additional data.
#[derive(Debug, Deserialize, Serialize)]
pub struct Error {
    /// Numeric error code
    pub code: i32,
    /// Human-readable error message
    pub message: String,
    /// Optional additional error data
    pub data: Option<Value>,
}

impl JsonRpcError {
    /// Creates a new JSON-RPC error response.
    ///
    /// # Arguments
    ///
    /// * `id` - The ID of the request this error is for
    /// * `code` - The numeric error code
    /// * `message` - The human-readable error message
    ///
    /// # Returns
    ///
    /// Returns a new `JsonRpcError` instance with the specified ID, code, and message,
    /// using the standard JSON-RPC version.
    #[allow(dead_code)]
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

/// Query parameters for filtering issues
///
/// This structure defines the parameters that can be used to filter and sort
/// issues when querying the SonarQube API. It supports a wide range of filters
/// including assignees, authors, creation dates, security categories, and more.
#[derive(Debug, Serialize, Deserialize)]
pub struct IssuesQueryParams {
    /// Key of the project to query issues from
    pub project_key: String,
    /// Sort order: true for ascending, false for descending
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asc: Option<bool>,
    /// Filter for issues assigned to the authenticated user
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assigned_to_me: Option<bool>,
    /// List of assignee logins to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assignees: Option<Vec<String>>,
    /// List of issue authors to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub authors: Option<Vec<String>>,
    /// List of code variant identifiers to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_variants: Option<Vec<String>>,
    /// Filter issues created after this date (format: YYYY-MM-DD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_after: Option<String>,
    /// Filter issues created before this date (format: YYYY-MM-DD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_before: Option<String>,
    /// Filter issues created during a time span before now (e.g., "1m" for 1 month)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_in_last: Option<String>,
    /// List of CWE identifiers to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwe: Option<Vec<String>>,
    /// List of directories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directories: Option<Vec<String>>,
    /// List of facets to return in the response
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facets: Option<Vec<String>>,
    /// List of file paths to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub files: Option<Vec<String>>,
    /// List of impact severities to filter by (e.g., HIGH, MEDIUM, LOW)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impact_severities: Option<Vec<String>>,
    /// List of software qualities to filter by (e.g., MAINTAINABILITY, RELIABILITY, SECURITY)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impact_software_qualities: Option<Vec<String>>,
    /// List of issue statuses to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_statuses: Option<Vec<String>>,
    /// List of language keys to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<Vec<String>>,
    /// List of OWASP Top 10 categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owasp_top10: Option<Vec<String>>,
    /// List of OWASP Top 10 2021 categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owasp_top10_2021: Option<Vec<String>>,
    /// Page number for pagination
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<i32>,
    /// Number of items per page
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_size: Option<i32>,
    /// List of issue resolutions to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolutions: Option<Vec<String>>,
    /// Filter resolved issues
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved: Option<bool>,
    /// List of rule keys to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rules: Option<Vec<String>>,
    /// List of SANS Top 25 categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sans_top25: Option<Vec<String>>,
    /// List of issue severities to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub severities: Option<Vec<String>>,
    /// List of SonarSource security categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sonarsource_security: Option<Vec<String>>,
    /// Field to sort by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_field: Option<String>,
    /// List of issue statuses to filter by (e.g., OPEN, CONFIRMED, RESOLVED, CLOSED)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub statuses: Option<Vec<String>>,
    /// List of tags to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// List of issue types to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub types: Option<Vec<String>>,
}

/// Parameters for listing projects
///
/// This structure defines the parameters for requesting a list of projects,
/// supporting pagination through optional page number and size parameters.
#[derive(Debug, Serialize, Deserialize)]
pub struct ListProjectsRequest {
    /// Page number
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<i32>,
    /// Page size
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_size: Option<i32>,
}

/// Result containing a list of projects
///
/// This structure contains the response for a projects/list request,
/// including a collection of available projects.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListProjectsResult {
    /// List of projects
    pub projects: Vec<Project>,
}

/// Request parameters for retrieving project metrics
///
/// This structure defines the parameters for requesting metrics data
/// for a specific project, optionally filtering for specific metrics.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetMetricsRequest {
    /// Project key
    pub project_key: String,
    /// Optional list of metrics to retrieve
    pub metrics: Option<Vec<String>>,
}

/// Result containing project metrics data
///
/// This structure contains the response for a metrics/get request,
/// including the requested metrics data in a JSON value format.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetMetricsResult {
    /// Metrics data
    pub metrics: Value,
}

/// Request parameters for retrieving project issues
///
/// This structure defines the parameters for requesting issues data
/// for a specific project, with optional filtering parameters.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetIssuesRequest {
    /// Project key
    pub project_key: String,
    /// Optional filters
    #[serde(flatten)]
    pub filters: IssuesQueryParams,
}

/// Result containing project issues data
///
/// This structure contains the response for an issues/get request,
/// including the requested issues data in a JSON value format.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetIssuesResult {
    /// Issues data
    pub issues: Value,
}

/// Request parameters for retrieving quality gate status
///
/// This structure defines the parameters for requesting the quality gate
/// status for a specific project.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetQualityGateRequest {
    /// Project key
    pub project_key: String,
}

/// Result containing quality gate status
///
/// This structure contains the response for a quality-gate/get request,
/// including the project's quality gate status in a JSON value format.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetQualityGateResult {
    /// Quality gate status
    pub status: Value,
}

/// Result type alias for request handlers
///
/// This type alias defines the standard result type used by request handlers,
/// wrapping the success type T in a Result with anyhow::Error as the error type.
pub type HandlerResult<T> = Result<T, anyhow::Error>;
