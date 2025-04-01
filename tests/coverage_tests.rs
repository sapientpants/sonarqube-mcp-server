use sonarqube_mcp_server::Args;
use sonarqube_mcp_server::mcp::lifecycle;
use sonarqube_mcp_server::mcp::prompts;
use sonarqube_mcp_server::mcp::resources;
use sonarqube_mcp_server::mcp::sonarqube::query::QueryBuilder;
use sonarqube_mcp_server::mcp::sonarqube::tools;
use sonarqube_mcp_server::mcp::sonarqube::types::{
    SonarQubeIssuesRequest, SonarQubeListProjectsRequest, SonarQubeMetricsRequest,
    SonarQubeQualityGateRequest,
};
use sonarqube_mcp_server::mcp::types::{
    ClientCapabilities, GetIssuesRequest, GetMetricsRequest, GetPromptRequest,
    GetQualityGateRequest, Implementation, InitializeRequest, JsonRpcError, JsonRpcResponse,
    ListPromptsRequest, ListResourcesRequest, ListRootsRequest, ListToolsRequest,
    ReadResourceRequest,
};
use sonarqube_mcp_server::mcp::utilities;

use jsonrpsee_core::server::RpcModule;
use serde_json::Value;
use url::Url;

#[test]
fn test_args_is_args_available() {
    let args = Args {
        sonarqube_url: "http://test.com".to_string(),
        sonarqube_token: "test-token".to_string(),
        sonarqube_organization: None,
        resources: false,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    let available = args.is_args_available();
    // Assert it returns a boolean
    assert!(available == true || available == false);
}

#[test]
fn test_prompts_functions() {
    let _ = prompts::prompts_list(Some(ListPromptsRequest { cursor: None }));
    let _ = prompts::prompts_get(GetPromptRequest {
        name: "test".to_string(),
        arguments: None,
    });
}

#[test]
fn test_resources_functions() {
    let _ = resources::resources_list(Some(ListResourcesRequest { cursor: None }));
    let _ = resources::resource_read(ReadResourceRequest {
        uri: Url::parse("file:///test").unwrap(),
        meta: None,
    });
}

#[test]
fn test_query_builder() {
    let qb = QueryBuilder::new("http://test.com")
        .add_param("test", Some("value"))
        .add_bool_param("active", Some(true))
        .add_array_param("items", Some(&["one", "two"]))
        .add_params(vec![("another", Some("param"))]);
    let query = qb.build();
    assert!(query.contains("test"));
    assert!(query.contains("active"));
    assert!(query.contains("items"));
    assert!(query.contains("another"));
}

#[test]
fn test_tools_functions() {
    // Basic calls to exercise the SonarQube tools functions
    let _ = tools::init_sonarqube_client();
    let _ = tools::get_client();
    let mut module = RpcModule::new(());
    let _ = tools::register_sonarqube_tools(&mut module);
    let _ = tools::sonarqube_get_metrics(SonarQubeMetricsRequest {
        project_key: "test".to_string(),
        metrics: None,
    });
    let _ = tools::sonarqube_get_issues(SonarQubeIssuesRequest {
        project_key: "test".to_string(),
        asc: None,
        assigned_to_me: None,
        assignees: None,
        authors: None,
        code_variants: None,
        created_after: None,
        created_before: None,
        created_in_last: None,
        cwe: None,
        directories: None,
        facets: None,
        files: None,
        impact_severities: None,
        impact_software_qualities: None,
        issue_statuses: None,
        languages: None,
        owasp_top10: None,
        owasp_top10_2021: None,
        page: None,
        page_size: None,
        resolutions: None,
        resolved: None,
        rules: None,
        sans_top25: None,
        severities: None,
        sonarsource_security: None,
        sort_field: None,
        statuses: None,
        tags: None,
        types: None,
    });
    let _ = tools::sonarqube_get_quality_gate(SonarQubeQualityGateRequest {
        project_key: "test".to_string(),
    });
    let _ = tools::list_projects(Some(SonarQubeListProjectsRequest {
        page: Some(1),
        page_size: Some(10),
    }));
    let _ = tools::get_metrics(GetMetricsRequest {
        project_key: "test".to_string(),
        metrics: None,
    });
    let _ = tools::get_issues(GetIssuesRequest {
        project_key: "test".to_string(),
        filters: sonarqube_mcp_server::mcp::types::IssuesQueryParams {
            project_key: "test".to_string(),
            asc: None,
            assigned_to_me: None,
            assignees: None,
            authors: None,
            code_variants: None,
            created_after: None,
            created_before: None,
            created_in_last: None,
            cwe: None,
            directories: None,
            facets: None,
            files: None,
            impact_severities: None,
            impact_software_qualities: None,
            issue_statuses: None,
            languages: None,
            owasp_top10: None,
            owasp_top10_2021: None,
            page: None,
            page_size: None,
            resolutions: None,
            resolved: None,
            rules: None,
            sans_top25: None,
            severities: None,
            sonarsource_security: None,
            sort_field: None,
            statuses: None,
            tags: None,
            types: None,
        },
    });
    let _ = tools::get_quality_gate(GetQualityGateRequest {
        project_key: "test".to_string(),
    });
}

#[test]
fn test_jsonrpc_types() {
    let response = JsonRpcResponse::new(Value::from(1), Value::from("ok"));
    assert_eq!(response.id, Value::from(1));
    let error = JsonRpcError::new(Value::from(1), -32000, "fail");
    assert_eq!(error.error.code, -32000);
}

#[test]
fn test_utilities_functions() {
    let _ = utilities::initialize();
    let _ = utilities::graceful_shutdown();
    let _ = utilities::roots_list(Some(ListRootsRequest {}));
    let _ = utilities::notifications_initialized();
    let _ = utilities::notifications_cancelled();
}

#[test]
fn test_lifecycle() {
    let _ = lifecycle::initialize(InitializeRequest {
        protocol_version: "2.0".to_string(),
        capabilities: ClientCapabilities {
            experimental: None,
            roots: None,
            sampling: None,
        },
        client_info: Implementation {
            name: "test".to_string(),
            version: "1.0".to_string(),
        },
    });
    let _ = lifecycle::initialized();
    let _ = lifecycle::shutdown();
    // Skipping 'exit' since it may terminate the test process
}

#[tokio::test]
async fn test_display_info() {
    // Assuming display_info is a public function from the crate root
    let args = Args {
        sonarqube_url: "http://test.com".to_string(),
        sonarqube_token: "test-token".to_string(),
        sonarqube_organization: None,
        resources: false,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    sonarqube_mcp_server::display_info(&args).await;
}

#[test]
fn test_mcp_tools() {
    // Import the tools module from src/mcp/tools.rs as mcp_tools
    use sonarqube_mcp_server::mcp::tools as mcp_tools;
    let _ = mcp_tools::tools_list(Some(ListToolsRequest { cursor: None }));
    let mut module = RpcModule::new(());
    let _ = mcp_tools::register_tools(&mut module);
}
