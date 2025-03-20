use crate::mcp::sonarqube::tools::register_sonarqube_tools;
use crate::mcp::types::*;
use rpc_router::{Handler, HandlerResult, RouterBuilder, RpcParams};
use serde::{Deserialize, Serialize};
use serde_json;

/// register all tools to the router
pub fn register_tools(router_builder: RouterBuilder) -> RouterBuilder {
    let builder = router_builder
        .append_dyn("tools/list", tools_list.into_dyn())
        .append_dyn("get_current_time_in_city", current_time.into_dyn());

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

#[derive(Deserialize, Serialize, RpcParams)]
pub struct CurrentTimeRequest {
    pub city: Option<String>,
}

pub async fn current_time(_request: CurrentTimeRequest) -> HandlerResult<CallToolResult> {
    let result = format!("Now: {}!", chrono::Local::now().to_rfc2822());
    Ok(CallToolResult {
        content: vec![CallToolResultContent::Text { text: result }],
        is_error: false,
    })
}
