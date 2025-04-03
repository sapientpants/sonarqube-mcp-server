use std::sync::Arc;
use tracing::info;

use crate::mcp::core::context::McpContext;
use crate::mcp::core::errors::{McpError, McpResult};
use crate::mcp::core::server::McpServer;
use crate::mcp::sonarqube::context::ServerContext;

/// SonarQube implementation of the McpServer trait
///
/// This struct provides a SonarQube-specific implementation of the McpServer trait.
/// It adds SonarQube-specific functionality to the base MCP server.
pub struct SonarQubeServer {
    /// SonarQube server context
    context: ServerContext,
}

impl SonarQubeServer {
    /// Create a new SonarQube server
    ///
    /// # Arguments
    ///
    /// * `context` - SonarQube server context
    pub fn new(context: ServerContext) -> Self {
        Self { context }
    }
    
    /// Get the SonarQube server context
    pub fn get_sonarqube_context(&self) -> &ServerContext {
        &self.context
    }
}

impl McpServer for SonarQubeServer {
    fn get_context(&self) -> &McpContext {
        &self.context.mcp
    }

    fn initialize(&self) -> McpResult<()> {
        info!("Initializing SonarQube MCP server");
        // Here we could do SonarQube-specific initialization
        Ok(())
    }

    fn client_initialized(&self) -> McpResult<()> {
        info!("SonarQube MCP client initialized");
        Ok(())
    }

    fn shutdown(&self) -> McpResult<()> {
        info!("Shutting down SonarQube MCP server");
        Ok(())
    }

    fn exit(&self) -> McpResult<()> {
        info!("Exiting SonarQube MCP server");
        Ok(())
    }

    fn list_resources(&self) -> McpResult<Vec<String>> {
        // Get SonarQube-specific resources
        let mut resources = Vec::new();
        // Add resource IDs here
        resources.push("sonarqube/readme".to_string());
        resources.push("sonarqube/usage".to_string());
        
        Ok(resources)
    }

    fn get_resource(&self, resource_id: &str) -> McpResult<String> {
        match resource_id {
            "sonarqube/readme" => Ok(include_str!("../templates/readme.md").to_string()),
            "sonarqube/usage" => Ok(include_str!("../templates/usage.md").to_string()),
            _ => Err(McpError::NotFound(format!("Resource not found: {}", resource_id))),
        }
    }

    fn list_prompts(&self) -> McpResult<Vec<String>> {
        // Get SonarQube-specific prompts
        let mut prompts = Vec::new();
        // Add prompt IDs here
        prompts.push("sonarqube/fix_issue".to_string());
        prompts.push("sonarqube/explain_issue".to_string());
        
        Ok(prompts)
    }

    fn get_prompt(&self, prompt_id: &str) -> McpResult<String> {
        match prompt_id {
            "sonarqube/fix_issue" => Ok("Help me fix the following SonarQube issue: $ISSUE".to_string()),
            "sonarqube/explain_issue" => Ok("Explain what is wrong with this code: $CODE".to_string()),
            _ => Err(McpError::NotFound(format!("Prompt not found: {}", prompt_id))),
        }
    }
} 