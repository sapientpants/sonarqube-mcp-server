use crate::mcp::core::context::McpContext;
use crate::mcp::core::errors::{McpError, McpResult};

/// Generic MCP server interface
///
/// This trait defines the common interface for all MCP servers,
/// regardless of the specific tool provider implementation.
/// It allows for a clean separation between the MCP protocol
/// and the specific tool implementations.
pub trait McpServer {
    /// Get the MCP context for this server
    fn get_context(&self) -> &McpContext;

    /// Initialize the server
    ///
    /// Called during the initialization phase of the MCP protocol.
    fn initialize(&self) -> McpResult<()>;

    /// Handle protocol notification that client is initialized
    ///
    /// Called when the client signals it has completed initialization.
    fn client_initialized(&self) -> McpResult<()>;

    /// Prepare for shutdown
    ///
    /// Called when the client requests a server shutdown.
    fn shutdown(&self) -> McpResult<()>;

    /// Exit the server
    ///
    /// Called when the client requests a server exit.
    fn exit(&self) -> McpResult<()>;

    /// List available resources
    ///
    /// Returns a list of resources available from this server.
    fn list_resources(&self) -> McpResult<Vec<String>>;

    /// Get resource content
    ///
    /// Returns the content of a specific resource.
    fn get_resource(&self, resource_id: &str) -> McpResult<String>;

    /// List available prompts
    ///
    /// Returns a list of prompts available from this server.
    fn list_prompts(&self) -> McpResult<Vec<String>>;

    /// Get prompt content
    ///
    /// Returns the content of a specific prompt.
    fn get_prompt(&self, prompt_id: &str) -> McpResult<String>;
}

/// Base implementation of the McpServer trait
///
/// This struct provides a base implementation of the McpServer trait
/// that can be extended by specific tool providers.
pub struct BaseMcpServer {
    /// MCP context
    context: McpContext,
}

impl BaseMcpServer {
    /// Create a new base MCP server
    ///
    /// # Arguments
    ///
    /// * `context` - MCP context
    pub fn new(context: McpContext) -> Self {
        Self { context }
    }
}

impl McpServer for BaseMcpServer {
    fn get_context(&self) -> &McpContext {
        &self.context
    }

    fn initialize(&self) -> McpResult<()> {
        Ok(())
    }

    fn client_initialized(&self) -> McpResult<()> {
        Ok(())
    }

    fn shutdown(&self) -> McpResult<()> {
        Ok(())
    }

    fn exit(&self) -> McpResult<()> {
        Ok(())
    }

    fn list_resources(&self) -> McpResult<Vec<String>> {
        Ok(Vec::new())
    }

    fn get_resource(&self, _resource_id: &str) -> McpResult<String> {
        Err(McpError::NotFound("Resource not found".to_string()))
    }

    fn list_prompts(&self) -> McpResult<Vec<String>> {
        Ok(Vec::new())
    }

    fn get_prompt(&self, _prompt_id: &str) -> McpResult<String> {
        Err(McpError::NotFound("Prompt not found".to_string()))
    }
}
