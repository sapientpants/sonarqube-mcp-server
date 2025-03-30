use crate::mcp::sonarqube::tools::register_sonarqube_tools;
use crate::mcp::types::*;
use rpc_router::{Handler, HandlerResult, RouterBuilder};
use serde_json;

/// Registers all available MCP tools with the router.
///
/// This function initializes all tools that the MCP server provides, including
/// the built-in tools_list tool and all domain-specific tools such as SonarQube tools.
/// Each tool is registered with the router under its specific path following the
/// naming convention of 'domain/action'.
///
/// # Arguments
///
/// * `router_builder` - The router builder instance to register tools with
///
/// # Returns
///
/// Returns the router builder with all tools registered
pub fn register_tools(router_builder: RouterBuilder) -> RouterBuilder {
    let builder = router_builder.append_dyn("tools/list", tools_list.into_dyn());

    // Register SonarQube tools
    register_sonarqube_tools(builder)
}

/// Lists all available tools that the MCP server provides.
///
/// This handler function returns information about all tools registered with
/// the MCP server. The tool definitions are stored in a JSON file and include
/// details such as name, description, parameters, and result schema.
///
/// # Arguments
///
/// * `_request` - Optional request parameters for listing tools (currently unused)
///
/// # Returns
///
/// Returns a result containing the list of all available tools
pub async fn tools_list(_request: Option<ListToolsRequest>) -> HandlerResult<ListToolsResult> {
    let tools: Vec<Tool> = serde_json::from_str(include_str!("./templates/tools.json")).unwrap();
    let response = ListToolsResult {
        tools,
        next_cursor: None,
    };
    Ok(response)
}
