use crate::mcp::sonarqube::tools::register_sonarqube_tools;
use crate::mcp::types::*;
use rpc_router::{Handler, HandlerResult, RouterBuilder};
use serde_json;

/// register all tools to the router
pub fn register_tools(router_builder: RouterBuilder) -> RouterBuilder {
    let builder = router_builder.append_dyn("tools/list", tools_list.into_dyn());

    // Register SonarQube tools
    register_sonarqube_tools(builder)
}

pub async fn tools_list(_request: Option<ListToolsRequest>) -> HandlerResult<ListToolsResult> {
    let tools: Vec<Tool> = serde_json::from_str(include_str!("./templates/tools.json")).unwrap();
    let response = ListToolsResult {
        tools,
        next_cursor: None,
    };
    Ok(response)
}
