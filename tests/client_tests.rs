mod helpers;

use helpers::{load_fixture, mock_base_url, mock_token, test_project_key};
use sonarqube_mcp_server::mcp::sonarqube::client::SonarQubeClient;
use sonarqube_mcp_server::mcp::sonarqube::tools::{
    SONARQUBE_ORGANIZATION_ENV, SONARQUBE_TOKEN_ENV, SONARQUBE_URL_ENV,
};
use sonarqube_mcp_server::mcp::sonarqube::types::*;
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, path, query_param},
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
        organization: None,
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
        organization: None,
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
        organization: None,
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
        organization: None,
    });

    // Call function and verify results
    let project_key = test_project_key();
    let mut params = IssuesQueryParams::new(&project_key);
    params.severities = Some(&["CRITICAL", "MAJOR"]);
    params.types = Some(&["BUG", "VULNERABILITY"]);

    let issues = client.get_issues(params).await.unwrap();

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
        organization: None,
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

#[tokio::test]
async fn test_list_projects_success() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for projects endpoint with the correct endpoint path
    Mock::given(method("GET"))
        .and(path("/api/components/search"))
        .and(query_param("qualifiers", "TRK"))
        .respond_with(ResponseTemplate::new(200).set_body_string(
            r#"{
                "paging": {
                    "pageIndex": 1,
                    "pageSize": 50,
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
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    // Call function and verify results
    let projects = client.list_projects(None, None, None).await.unwrap();

    // Verify response data
    assert_eq!(projects.paging.page_index, 1);
    assert_eq!(projects.paging.page_size, 50);
    assert_eq!(projects.paging.total, 2);
    assert_eq!(projects.components.len(), 2);

    // Verify project details
    let first_project = &projects.components[0];
    assert_eq!(first_project.key, "test-project-1");
    assert_eq!(first_project.name, "Test Project 1");

    let second_project = &projects.components[1];
    assert_eq!(second_project.key, "test-project-2");
    assert_eq!(second_project.name, "Test Project 2");
}

#[tokio::test]
async fn test_list_projects_with_organization() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for projects endpoint with organization using the correct endpoint
    Mock::given(method("GET"))
        .and(path("/api/components/search"))
        .and(query_param("qualifiers", "TRK"))
        .and(query_param("organization", "my-org"))
        .respond_with(ResponseTemplate::new(200).set_body_string(
            r#"{
                "paging": {
                    "pageIndex": 1,
                    "pageSize": 100,
                    "total": 1
                },
                "components": [
                    {
                        "key": "my-org-project",
                        "name": "Organization Project",
                        "qualifier": "TRK"
                    }
                ]
            }"#,
        ))
        .expect(1)
        .mount(&mock_server)
        .await;

    // Create client with mock server URL
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None, // We'll override this in the method call
    });

    // Call function with organization override
    let projects = client
        .list_projects(None, None, Some("my-org"))
        .await
        .unwrap();

    // Verify response data
    assert_eq!(projects.paging.total, 1);
    assert_eq!(projects.components.len(), 1);

    // Verify project details
    let project = &projects.components[0];
    assert_eq!(project.key, "my-org-project");
    assert_eq!(project.name, "Organization Project");
}

#[tokio::test]
async fn test_rate_limiting() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response with rate limit headers
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("component", "test-project"))
        .respond_with(
            ResponseTemplate::new(429)
                .set_body_string(r#"{"errors":[{"msg":"Rate limit exceeded"}]}"#)
                .insert_header("X-RateLimit-Remaining", "0")
                .insert_header("X-RateLimit-Reset", "60"),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;

    match result {
        Err(SonarError::Api(msg)) => {
            assert!(msg.contains("Rate limit exceeded"));
        }
        _ => panic!(
            "Expected Api error with rate limit message, got: {:?}",
            result
        ),
    }
}

#[tokio::test]
async fn test_connection_error() {
    // Create client with non-existent server
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: "http://non.existent.server".to_string(),
        token: mock_token(),
        organization: None,
    });

    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;

    match result {
        Err(SonarError::Http(err)) => {
            assert!(err.is_connect() || err.is_timeout());
        }
        _ => panic!(
            "Expected Http error with connection error, got: {:?}",
            result
        ),
    }
}

#[tokio::test]
async fn test_malformed_response() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response with invalid JSON
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .respond_with(ResponseTemplate::new(200).set_body_string("invalid json"))
        .expect(1)
        .mount(&mock_server)
        .await;

    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;

    match result {
        Err(SonarError::Parse(_)) => {}
        _ => panic!("Expected Parse error, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_server_error() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response with server error
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .respond_with(
            ResponseTemplate::new(500)
                .set_body_string(r#"{"errors":[{"msg":"Internal server error"}]}"#),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;

    match result {
        Err(SonarError::Api(msg)) => {
            assert!(msg.contains("Internal server error"));
        }
        _ => panic!(
            "Expected Api error with server error message, got: {:?}",
            result
        ),
    }
}

#[tokio::test]
async fn test_config_error() {
    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: "not-a-url".to_string(), // Invalid URL format should trigger config error
        token: mock_token(),
        organization: None,
    });

    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;

    match result {
        Err(SonarError::Http(err)) => {
            assert!(err.to_string().contains("builder error"));
        }
        _ => panic!(
            "Expected Http error with builder error message, got: {:?}",
            result
        ),
    }
}

#[tokio::test]
async fn test_api_error() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response with API error
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .respond_with(
            ResponseTemplate::new(400)
                .set_body_string(r#"{"errors":[{"msg":"Invalid metric key: invalid_metric"}]}"#),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: None,
    });

    let result = client
        .get_metrics(&test_project_key(), &["invalid_metric"])
        .await;

    match result {
        Err(SonarError::Api(_)) => {}
        _ => panic!("Expected Api error, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_organization_handling() {
    // Start a mock server
    let mock_server = MockServer::start().await;

    // Setup mock response for metrics endpoint with organization
    Mock::given(method("GET"))
        .and(path("/api/measures/component"))
        .and(query_param("organization", "test-org"))
        .respond_with(
            ResponseTemplate::new(200).set_body_string(load_fixture("metrics_response.json")),
        )
        .expect(1)
        .mount(&mock_server)
        .await;

    let client = SonarQubeClient::new(SonarQubeConfig {
        base_url: mock_base_url(&mock_server),
        token: mock_token(),
        organization: Some("test-org".to_string()),
    });

    let result = client.get_metrics(&test_project_key(), &["ncloc"]).await;
    assert!(result.is_ok());
}
