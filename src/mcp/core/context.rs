use crate::mcp::core::config::McpConfig;

/// MCP server context
///
/// This structure contains the core MCP context information
/// that is shared across all MCP server implementations.
#[derive(Debug, Clone)]
pub struct McpContext {
    /// Server name
    pub server_name: String,
    /// Server version
    pub server_version: String,
    /// Protocol version
    pub protocol_version: String,
    /// MCP configuration
    pub config: McpConfig,
}

impl McpContext {
    /// Create a new MCP context
    ///
    /// # Arguments
    ///
    /// * `config` - MCP configuration
    pub fn new(config: McpConfig) -> Self {
        Self {
            server_name: config.server_name.clone(),
            server_version: env!("CARGO_PKG_VERSION").to_string(),
            protocol_version: "1.0".to_string(),
            config,
        }
    }
}

impl Default for McpContext {
    /// Create a default MCP context
    fn default() -> Self {
        let config = McpConfig::default_config();
        Self::new(config)
    }
}

/// Trait for types that provide access to an McpContext
///
/// This trait is implemented by context types that contain or can
/// provide access to an MCP context. It allows functions to be
/// generic over different context types that all contain the MCP
/// context information.
pub trait HasMcpContext {
    /// Get the MCP context
    fn mcp_context(&self) -> &McpContext;
}

/// Direct implementation for McpContext itself
impl HasMcpContext for McpContext {
    fn mcp_context(&self) -> &McpContext {
        self
    }
}
