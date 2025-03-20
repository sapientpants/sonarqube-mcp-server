mod helpers;

use helpers::{load_fixture, mock_base_url, mock_token, test_project_key};
use sonarqube_mcp_server::mcp::sonarqube::client::SonarQubeClient;
use sonarqube_mcp_server::mcp::sonarqube::types::*;
use wiremock::{
    matchers::{method, path, query_param},
    Mock, MockServer, ResponseTemplate,
};

#[tokio::test]
async fn test_get_metrics_success() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for metrics endpoint
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("component", "test-project"))
        .and(query_param("metricKeys", "ncloc,bugs,vulnerabilities"))
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
    });

    // Call function and verify results
    let metrics = client
        .get_metrics(&test_project_key(), &["ncloc", "bugs", "vulnerabilities"])
        .await
        .unwrap();

    // Verify response data
    assert_eq!(metrics.component.key, "test-project");
    assert_eq!(metrics.component.name, "Test Project");

    // Find specific metrics
    let ncloc = metrics
        .component
        .measures
        .iter()
        .find(|m| m.metric == "ncloc")
        .expect("ncloc metric not found");
    assert_eq!(ncloc.value, "1200");

    let bugs = metrics
        .component
        .measures
        .iter()
        .find(|m| m.metric == "bugs")
        .expect("bugs metric not found");
    assert_eq!(bugs.value, "12");
}

#[tokio::test]
async fn test_get_metrics_project_not_found() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for metrics endpoint with 404 error
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("component", "unknown-project"))
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
    });

    // Call function and verify error
    let result = client
        .get_metrics("unknown-project", &["ncloc", "bugs"])
        .await;

    // Verify error type
    match result {
        Err(SonarError::ProjectNotFound(project_key)) => {
            assert_eq!(project_key, "unknown-project");
        }
        _ => panic!("Expected ProjectNotFound error, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_get_metrics_auth_error() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for metrics endpoint with 401 error
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .respond_with(ResponseTemplate::new(401))
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: "invalid-token".to_string(),
    });

    // Call function and verify error
    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;

    // Verify error type
    match result {
        Err(SonarError::AuthError) => {}
        _ => panic!("Expected AuthError, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_get_issues_success() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for issues endpoint
    Mock::given(method("GET"))
        .and(path("/api/issues/search"))
        .and(query_param("componentKeys", "test-project"))
        .and(query_param("severities", "CRITICAL,MAJOR"))
        .and(query_param("types", "BUG,VULNERABILITY"))
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
    });

    // Call function and verify results
    let issues = client
        .get_issues(
            &test_project_key(),
            Some(&["CRITICAL", "MAJOR"]),
            Some(&["BUG", "VULNERABILITY"]),
            None,
            None,
        )
        .await
        .unwrap();

    // Verify response data
    assert_eq!(issues.total, 3);
    assert_eq!(issues.issues.len(), 3);

    // Verify first issue
    let first_issue = &issues.issues[0];
    assert_eq!(first_issue.key, "AYvY2lJ9_IXl7o1tUh_r");
    assert_eq!(first_issue.severity, "CRITICAL");
    assert_eq!(first_issue.issue_type, "CODE_SMELL");

    // Verify components
    assert_eq!(issues.components.len(), 3);
    let app_component = issues
        .components
        .iter()
        .find(|c| c.key == "test-project:src/main/java/com/example/App.java")
        .expect("App.java component not found");
    assert_eq!(app_component.name, "App.java");
}

#[tokio::test]
async fn test_get_quality_gate_success() {
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
    });

    // Call function and verify results
    let quality_gate = client.get_quality_gate(&test_project_key()).await.unwrap();

    // Verify response data
    assert_eq!(quality_gate.project_status.status, "ERROR");
    assert_eq!(quality_gate.project_status.conditions.len(), 4);

    // Find failing condition
    let failing_condition = quality_gate
        .project_status
        .conditions
        .iter()
        .find(|c| c.status == "ERROR")
        .expect("Failing condition not found");
    assert_eq!(failing_condition.metric_key, "new_maintainability_rating");
    assert_eq!(failing_condition.actual_value, "2");
}
