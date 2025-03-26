mod helpers;

use helpers::{load_fixture, mock_base_url, mock_token, test_project_key};
use sonarqube_mcp_server::mcp::sonarqube::client::SonarQubeClient;
use sonarqube_mcp_server::mcp::sonarqube::types::*;
use sonarqube_mcp_server::mcp::tools::tools_list;
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, path, query_param},
};

#[tokio::test]
async fn test_sonarqube_get_metrics_tool() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for metrics endpoint
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("component", "test-project"))
        .and(query_param(
            "metricKeys",
            "ncloc,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density",
        ))
        .respond_with(
            ResponseTemplate::new(200).set_body_string(load_fixture("metrics_response.json")),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    // Define metrics array
    let metrics = [
        "ncloc",
        "bugs",
        "vulnerabilities",
        "code_smells",
        "coverage",
        "duplicated_lines_density",
    ];

    // Call client method directly
    let response = client
        .get_metrics(&test_project_key(), &metrics)
        .await
        .unwrap();

    // Verify response data
    assert_eq!(response.component.key, "test-project");
    assert_eq!(response.component.name, "Test Project");

    // Verify metrics
    let ncloc = response
        .component
        .measures
        .iter()
        .find(|m| m.metric == "ncloc")
        .expect("ncloc metric not found");
    assert_eq!(ncloc.value, "1200");

    let bugs = response
        .component
        .measures
        .iter()
        .find(|m| m.metric == "bugs")
        .expect("bugs metric not found");
    assert_eq!(bugs.value, "12");
}

#[tokio::test]
async fn test_sonarqube_get_issues_tool() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for issues endpoint
    Mock::given(method("GET"))
        .and(path("/api/issues/search"))
        .and(query_param("componentKeys", "test-project"))
        .respond_with(
            ResponseTemplate::new(200).set_body_string(load_fixture("issues_response.json")),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    // Call client method directly
    let project_key = test_project_key();
    let params = IssuesQueryParams::new(&project_key);
    let response = client.get_issues(params).await.unwrap();

    // Verify response data
    assert_eq!(response.total, 3);
    assert_eq!(response.issues.len(), 3);

    // Verify first issue
    let first_issue = &response.issues[0];
    assert_eq!(first_issue.key, "AYvY2lJ9_IXl7o1tUh_r");
    assert_eq!(first_issue.severity, "CRITICAL");
    assert_eq!(first_issue.issue_type, "CODE_SMELL");
}

#[tokio::test]
async fn test_sonarqube_get_quality_gate_tool() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for quality gate endpoint
    Mock::given(method("GET"))
        .and(path("/api/qualitygates/project_status"))
        .and(query_param("projectKey", "test-project"))
        .respond_with(
            ResponseTemplate::new(200).set_body_string(load_fixture("quality_gate_response.json")),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    // Call client method directly
    let response = client.get_quality_gate(&test_project_key()).await.unwrap();

    // Verify response data
    assert_eq!(response.project_status.status, "ERROR");
    assert_eq!(response.project_status.conditions.len(), 4);

    // Find failing condition
    let failing_condition = response
        .project_status
        .conditions
        .iter()
        .find(|c| c.status == "ERROR")
        .expect("Failing condition not found");
    assert_eq!(failing_condition.metric_key, "new_maintainability_rating");
    assert_eq!(failing_condition.actual_value, "2");
}

#[tokio::test]
async fn test_sonarqube_get_metrics_tool_with_error() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Define the unknown project key
    let unknown_project_key = "unknown-project";

    // Setup mock response for metrics endpoint with 404 error
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("component", unknown_project_key))
        .respond_with(
            ResponseTemplate::new(404).set_body_string(load_fixture("error_response.json")),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    // Call function and verify error
    let result = client
        .get_metrics(unknown_project_key, &["ncloc", "bugs"])
        .await;

    // Verify error type
    match result {
        Err(SonarError::ProjectNotFound(project_key)) => {
            assert_eq!(project_key, unknown_project_key);
        }
        _ => panic!("Expected ProjectNotFound error, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_tools_list() {
    // Call tools_list function
    let result = tools_list(None).await.unwrap();

    // Verify the response contains tools
    assert!(!result.tools.is_empty(), "Tools list should not be empty");

    // Verify the response contains SonarQube tools
    let sonarqube_tools = result
        .tools
        .iter()
        .filter(|t| t.name.starts_with("sonarqube"));
    assert!(
        sonarqube_tools.count() > 0,
        "Should contain SonarQube tools"
    );

    // Verify next_cursor is None
    assert!(result.next_cursor.is_none());
}

#[tokio::test]
#[ignore] // This is a placeholder test that requires setting the global client
async fn test_sonarqube_list_projects_tool() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for projects endpoint
    Mock::given(method("GET"))
        .and(path("/api/components/search"))
        .and(query_param("qualifiers", "TRK"))
        .respond_with(ResponseTemplate::new(200).set_body_string(
            r#"{
                "paging": {
                    "pageIndex": 1,
                    "pageSize": 100,
                    "total": 2
                },
                "components": [
                    {
                        "key": "test-project-1",
                        "name": "Test Project 1",
                        "qualifier": "TRK"
                    },
                    {
                        "key": "test-project-2",
                        "name": "Test Project 2",
                        "qualifier": "TRK"
                    }
                ]
            }"#,
        ))
        .mount(&mock_server)
        .await;

    // Create client with mock server URL and set the global client for tools
    let _client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    // Since we can't easily set the global client in tests, we'll skip this test for now
    // This is a placeholder to show how the test would be structured

    // The actual implementation would require setting the global SONARQUBE_CLIENT
    // and calling the sonarqube_list_projects function with a request

    // Ideally, we would:
    // 1. Set the global client
    // 2. Call sonarqube_list_projects
    // 3. Verify the response contains expected projects
}
