use serial_test::serial;
use sonarqube_mcp_server::mcp::core::types::CallToolResultContent;
use sonarqube_mcp_server::mcp::core::types::Project;
use sonarqube_mcp_server::mcp::sonarqube::config::{
    SONARQUBE_ORGANIZATION_ENV, SONARQUBE_TOKEN_ENV, SONARQUBE_URL_ENV,
};
use sonarqube_mcp_server::mcp::sonarqube::context::ServerContext;
use sonarqube_mcp_server::mcp::sonarqube::issues::sonarqube_get_issues;
use sonarqube_mcp_server::mcp::sonarqube::metrics::sonarqube_get_metrics;
use sonarqube_mcp_server::mcp::sonarqube::projects::list_projects;
use sonarqube_mcp_server::mcp::sonarqube::quality_gates::sonarqube_get_quality_gate;
use sonarqube_mcp_server::mcp::sonarqube::types::{
    SonarQubeConfig, SonarQubeIssuesRequest, SonarQubeListProjectsRequest, SonarQubeMetricsRequest,
    SonarQubeQualityGateRequest,
};
use std::env;
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sonarqube_get_metrics_no_client() {
        let request = SonarQubeMetricsRequest {
            project_key: "test-project".to_string(),
            metrics: Some(vec!["coverage".to_string()]),
        };
        let config = SonarQubeConfig {
            base_url: "http://localhost:9000".to_string(),
            token: "test-token".to_string(),
            organization: None,
        };
        let context = ServerContext::new(config);

        let mock_server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "components": [
                    { "key": "test-project", "name": "Test Project", "qualifier": "TRK" }
                ]
            })))
            .mount(&mock_server)
            .await;

        let result = sonarqube_get_metrics(request, &context).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_sonarqube_get_issues_no_client() {
        let request = SonarQubeIssuesRequest {
            project_key: "test-project".to_string(),
            severities: None,
            types: None,
            statuses: None,
            impact_severities: None,
            impact_software_qualities: None,
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
            issue_statuses: None,
            languages: None,
            owasp_top10: None,
            owasp_top10_2021: None,
            resolutions: None,
            resolved: None,
            rules: None,
            sans_top25: None,
            sonarsource_security: None,
            tags: None,
            sort_field: None,
            asc: None,
            page: None,
            page_size: None,
        };
        let config = SonarQubeConfig {
            base_url: "http://localhost:9000".to_string(),
            token: "test-token".to_string(),
            organization: None,
        };
        let context = ServerContext::new(config);

        let mock_server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "components": [
                    { "key": "test-project", "name": "Test Project", "qualifier": "TRK" }
                ]
            })))
            .mount(&mock_server)
            .await;

        let result = sonarqube_get_issues(request, &context).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_sonarqube_get_quality_gate_no_client() {
        let request = SonarQubeQualityGateRequest {
            project_key: "test-project".to_string(),
        };
        let config = SonarQubeConfig {
            base_url: "http://localhost:9000".to_string(),
            token: "test-token".to_string(),
            organization: None,
        };
        let context = ServerContext::new(config);

        let mock_server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "components": [
                    { "key": "test-project", "name": "Test Project", "qualifier": "TRK" }
                ]
            })))
            .mount(&mock_server)
            .await;

        let result = sonarqube_get_quality_gate(request, &context).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_call_tool_result_content_formatting() {
        let text_content = CallToolResultContent::Text {
            text: "Test result".to_string(),
        };
        let json = serde_json::to_string(&text_content).unwrap();
        assert!(json.contains(r#""type":"text""#));
        assert!(json.contains(r#""text":"Test result""#));
        let deserialized: CallToolResultContent = serde_json::from_str(&json).unwrap();
        match deserialized {
            CallToolResultContent::Text { text } => assert_eq!(text, "Test result"),
            _ => panic!("Expected Text variant"),
        }
    }

    #[tokio::test]
    async fn test_project_not_found_errors() {
        let original_url = env::var(SONARQUBE_URL_ENV).ok();
        let original_token = env::var(SONARQUBE_TOKEN_ENV).ok();
        let original_org = env::var(SONARQUBE_ORGANIZATION_ENV).ok();
        unsafe {
            env::set_var(SONARQUBE_URL_ENV, "http://localhost:9000");
            env::set_var(SONARQUBE_TOKEN_ENV, "test-token");
            if let Some(org) = &original_org {
                env::set_var(SONARQUBE_ORGANIZATION_ENV, org);
            } else {
                env::remove_var(SONARQUBE_ORGANIZATION_ENV);
            }
        }
        let context = ServerContext::from_env().expect("Context creation failed");

        let metrics_request = SonarQubeMetricsRequest {
            project_key: "non-existent-project".to_string(),
            metrics: Some(vec!["coverage".to_string()]),
        };
        let metrics_result = sonarqube_get_metrics(metrics_request, &context).await;
        assert!(metrics_result.is_err());

        let issues_request = SonarQubeIssuesRequest {
            project_key: "non-existent-project".to_string(),
            severities: None,
            types: None,
            statuses: None,
            impact_severities: None,
            impact_software_qualities: None,
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
            issue_statuses: None,
            languages: None,
            owasp_top10: None,
            owasp_top10_2021: None,
            resolutions: None,
            resolved: None,
            rules: None,
            sans_top25: None,
            sonarsource_security: None,
            tags: None,
            sort_field: None,
            asc: None,
            page: None,
            page_size: None,
        };
        let issues_result = sonarqube_get_issues(issues_request, &context).await;
        assert!(issues_result.is_err());

        let quality_gate_request = SonarQubeQualityGateRequest {
            project_key: "non-existent-project".to_string(),
        };
        let quality_gate_result = sonarqube_get_quality_gate(quality_gate_request, &context).await;
        assert!(quality_gate_result.is_err());

        unsafe {
            match original_url {
                Some(url) => env::set_var(SONARQUBE_URL_ENV, url),
                None => env::remove_var(SONARQUBE_URL_ENV),
            }
            match original_token {
                Some(token) => env::set_var(SONARQUBE_TOKEN_ENV, token),
                None => env::remove_var(SONARQUBE_TOKEN_ENV),
            }
            match original_org {
                Some(org) => env::set_var(SONARQUBE_ORGANIZATION_ENV, org),
                None => env::remove_var(SONARQUBE_ORGANIZATION_ENV),
            }
        }
    }

    #[test]
    fn test_get_client_error_when_no_env_vars() {
        let original_url = env::var(SONARQUBE_URL_ENV).ok();
        let original_token = env::var(SONARQUBE_TOKEN_ENV).ok();
        let original_org = env::var(SONARQUBE_ORGANIZATION_ENV).ok();

        unsafe {
            env::remove_var(SONARQUBE_URL_ENV);
            env::remove_var(SONARQUBE_TOKEN_ENV);
            env::remove_var(SONARQUBE_ORGANIZATION_ENV);
        }

        let result = ServerContext::from_env();
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("SONARQUBE_URL environment variable not set")
        );

        unsafe {
            env::set_var(SONARQUBE_URL_ENV, "http://localhost:9000");
        }
        let result = ServerContext::from_env();
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("SONARQUBE_TOKEN environment variable not set")
        );

        unsafe {
            env::set_var(SONARQUBE_TOKEN_ENV, "dummy_token");
        }
        let result = ServerContext::from_env();
        assert!(result.is_ok(), "Failed to initialize context");

        unsafe {
            match original_url {
                Some(url) => env::set_var(SONARQUBE_URL_ENV, url),
                None => env::remove_var(SONARQUBE_URL_ENV),
            }
            match original_token {
                Some(token) => env::set_var(SONARQUBE_TOKEN_ENV, token),
                None => env::remove_var(SONARQUBE_TOKEN_ENV),
            }
            match original_org {
                Some(org) => env::set_var(SONARQUBE_ORGANIZATION_ENV, org),
                None => env::remove_var(SONARQUBE_ORGANIZATION_ENV),
            }
        }
    }

    #[tokio::test]
    async fn test_sonarqube_get_metrics() {
        let mock_server = MockServer::start().await;
        let config = SonarQubeConfig {
            base_url: mock_server.uri(),
            token: "test-token".to_string(),
            organization: None,
        };
        let context = ServerContext::new(config);

        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "components": [
                    { "key": "test-project", "name": "Test Project", "qualifier": "TRK" }
                ]
            })))
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .and(query_param("component", "test-project"))
            .and(query_param("metricKeys", "coverage"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "key": "test-project",
                    "name": "Test Project",
                    "measures": [{"metric": "coverage", "value": "85.0"}]
                }
            })))
            .mount(&mock_server)
            .await;

        let request = SonarQubeMetricsRequest {
            project_key: "test-project".to_string(),
            metrics: Some(vec!["coverage".to_string()]),
        };
        let result = sonarqube_get_metrics(request, &context).await;

        assert!(result.is_ok(), "API call failed: {:?}", result);
        let tool_result = result.unwrap();
        assert!(!tool_result.is_error, "Tool call resulted in an error");
        if let CallToolResultContent::Text { text } =
            tool_result.content.get(0).expect("No content returned")
        {
            let json: serde_json::Value = serde_json::from_str(text).expect("Invalid JSON");
            let measure = json["component"]["measures"]
                .as_array()
                .unwrap()
                .iter()
                .find(|m| m["metric"] == "coverage")
                .expect("Coverage metric not found in measures");
            assert_eq!(measure["value"], "85.0");
        } else {
            panic!("Expected Text content");
        }
    }

    #[tokio::test]
    async fn test_sonarqube_get_issues() {
        let mock_server = MockServer::start().await;
        let config = SonarQubeConfig {
            base_url: mock_server.uri(),
            token: "test-token".to_string(),
            organization: None,
        };
        let context = ServerContext::new(config);

        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "components": [
                    { "key": "test-project", "name": "Test Project", "qualifier": "TRK" }
                ]
            })))
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/api/issues/search"))
            .and(query_param("componentKeys", "test-project"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "total": 1,
                "p": 1,
                "ps": 100,
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "issues": [{"key": "issue-1", "rule": "rule-1", "message": "Test issue", "severity": "MAJOR", "component": "test-component", "project": "test-project", "type": "BUG", "status": "OPEN", "creationDate": "2024-01-01T12:00:00+0000"}],
                "components": []
            })))
            .mount(&mock_server)
            .await;

        let request = SonarQubeIssuesRequest {
            project_key: "test-project".to_string(),
            severities: None,
            types: None,
            statuses: None,
            impact_severities: None,
            impact_software_qualities: None,
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
            issue_statuses: None,
            languages: None,
            owasp_top10: None,
            owasp_top10_2021: None,
            resolutions: None,
            resolved: None,
            rules: None,
            sans_top25: None,
            sonarsource_security: None,
            tags: None,
            sort_field: None,
            asc: None,
            page: None,
            page_size: None,
        };

        let result = sonarqube_get_issues(request, &context).await;
        assert!(result.is_ok(), "API call failed: {:?}", result);
        let tool_result = result.unwrap();
        assert!(!tool_result.is_error, "Tool call resulted in an error");
        if let CallToolResultContent::Text { text } =
            tool_result.content.get(0).expect("No content returned")
        {
            let json: serde_json::Value = serde_json::from_str(text).expect("Invalid JSON");
            assert!(json["issues"].is_array());
            assert_eq!(json["issues"][0]["key"], "issue-1");
            assert!(json["components"].is_array());
        } else {
            panic!("Expected Text content");
        }
    }

    #[tokio::test]
    async fn test_sonarqube_get_quality_gate() {
        let mock_server = MockServer::start().await;
        let config = SonarQubeConfig {
            base_url: mock_server.uri(),
            token: "test-token".to_string(),
            organization: None,
        };
        let context = ServerContext::new(config);

        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 100, "total": 1 },
                "components": [
                    { "key": "test-project", "name": "Test Project", "qualifier": "TRK" }
                ]
            })))
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/api/qualitygates/project_status"))
            .and(query_param("projectKey", "test-project"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "projectStatus": {
                    "status": "OK",
                    "conditions": [] // Add missing conditions field
                }
            })))
            .mount(&mock_server)
            .await;

        let request = SonarQubeQualityGateRequest {
            project_key: "test-project".to_string(),
        };

        let result = sonarqube_get_quality_gate(request, &context).await;
        assert!(result.is_ok(), "API call failed: {:?}", result);
        let tool_result = result.unwrap();
        assert!(!tool_result.is_error, "Tool call resulted in an error");
        if let CallToolResultContent::Text { text } =
            tool_result.content.get(0).expect("No content returned")
        {
            let json: serde_json::Value = serde_json::from_str(text).expect("Invalid JSON");
            assert_eq!(json["projectStatus"]["status"], "OK");
            assert!(json["projectStatus"]["conditions"].is_array());
        } else {
            panic!("Expected Text content");
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_list_projects_api_call() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("ps", "500"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 500, "total": 2 },
                "components": [
                    { "key": "proj1", "name": "Project One", "qualifier": "TRK", "visibility": "public" },
                    { "key": "proj2", "name": "Project Two", "qualifier": "TRK", "visibility": "private" }
                ]
            })))
            .mount(&mock_server)
            .await;

        let test_org = "test-org";
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("organization", test_org))
            .and(query_param("ps", "500"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 500, "total": 1 },
                "components": [
                    { "key": "org-proj", "name": "Org Project", "qualifier": "TRK", "visibility": "public" }
                ]
            })))
            .mount(&mock_server)
            .await;

        let explicit_org = "explicit-org";
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("organization", explicit_org))
            .and(query_param("ps", "500"))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 500, "total": 1 },
                "components": [
                    { "key": "explicit-proj", "name": "Explicit Org Project", "qualifier": "TRK", "visibility": "public" }
                ]
            })))
            .mount(&mock_server)
            .await;

        let original_url = env::var(SONARQUBE_URL_ENV).ok();
        let original_token = env::var(SONARQUBE_TOKEN_ENV).ok();
        let original_org = env::var(SONARQUBE_ORGANIZATION_ENV).ok();

        unsafe {
            env::set_var(SONARQUBE_URL_ENV, mock_server.uri());
            env::set_var(SONARQUBE_TOKEN_ENV, "test-token");
            env::set_var(SONARQUBE_ORGANIZATION_ENV, test_org);
        }

        println!("Setting SONARQUBE_URL_ENV to: {}", mock_server.uri());
        println!("Setting SONARQUBE_TOKEN_ENV to: test-token");
        println!("Setting SONARQUBE_ORGANIZATION_ENV to: {}", test_org);

        // After setting variables, log their values again
        println!(
            "After setting - SONARQUBE_URL_ENV: {:?}",
            env::var(SONARQUBE_URL_ENV)
        );
        println!(
            "After setting - SONARQUBE_TOKEN_ENV: {:?}",
            env::var(SONARQUBE_TOKEN_ENV)
        );
        println!(
            "After setting - SONARQUBE_ORGANIZATION_ENV: {:?}",
            env::var(SONARQUBE_ORGANIZATION_ENV)
        );

        // Create the ServerContext with organization after setting environment variables
        let context_with_org = ServerContext::from_env().expect("Context creation with org failed");

        // Print the context organization for debugging
        println!(
            "Context organization for first request: {:?}",
            context_with_org.config.organization
        );

        let request = SonarQubeListProjectsRequest {
            organization: None,
            page: None,
            page_size: Some(500),
        };
        let request_clone = request.clone();
        let result = list_projects(Some(request), &context_with_org).await;

        assert!(result.is_ok(), "list_projects failed: {:?}", result);
        let list_result = result.unwrap();
        let expected_projects = vec![
            Project {
                key: "proj1".to_string(),
                name: "Project One".to_string(),
            },
            Project {
                key: "proj2".to_string(),
                name: "Project Two".to_string(),
            },
        ];
        assert_eq!(list_result.projects, expected_projects);

        // Make sure we have a mock for the organization in the context
        // This mock for test-org is already set up above, but let's verify
        println!(
            "Checking that mock exists for context organization: {:?}",
            context_with_org.config.organization
        );

        // Add a fresh mock for the test_org value to ensure it's properly set up
        let test_org_clone = test_org;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("organization", test_org_clone))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 500, "total": 1 },
                "components": [
                    { "key": "refreshed-org-proj", "name": "Refreshed Org Project", "qualifier": "TRK", "visibility": "public" }
                ]
            })))
            .mount(&mock_server)
            .await;

        println!("Added fresh mock for organization: {}", test_org_clone);

        // Now test with the existing context
        let request_no_org = SonarQubeListProjectsRequest {
            organization: None,
            page: None,
            page_size: None,
        };
        println!(
            "Second request - organization: {:?}, page: {:?}, page_size: {:?}",
            request_no_org.organization, request_no_org.page, request_no_org.page_size
        );
        let result_with_org = list_projects(Some(request_no_org), &context_with_org).await;

        println!(
            "Context organization: {:?}",
            context_with_org.config.organization
        );

        assert!(
            result_with_org.is_ok(),
            "list_projects with org failed: {:?}",
            result_with_org
        );
        let list_result_org = result_with_org.unwrap();
        let expected_projects_org = vec![Project {
            key: "refreshed-org-proj".to_string(),
            name: "Refreshed Org Project".to_string(),
        }];
        assert_eq!(list_result_org.projects, expected_projects_org);

        // Add a fresh mock for the explicit organization
        let explicit_org = "explicit-org";
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("organization", explicit_org))
            .and(query_param("qualifiers", "TRK"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "paging": { "pageIndex": 1, "pageSize": 500, "total": 1 },
                "components": [
                    { "key": "explicit-proj", "name": "Explicit Org Project", "qualifier": "TRK", "visibility": "public" }
                ]
            })))
            .mount(&mock_server)
            .await;

        println!(
            "Added fresh mock for explicit organization: {}",
            explicit_org
        );

        let _request_explicit_org = SonarQubeListProjectsRequest {
            organization: Some(explicit_org.to_string()),
            page: None,
            page_size: None,
        };
        let result_explicit_org =
            list_projects(Some(_request_explicit_org.clone()), &context_with_org).await;

        assert!(
            result_explicit_org.is_ok(),
            "list_projects with explicit org failed: {:?}",
            result_explicit_org
        );
        let list_result_explicit = result_explicit_org.unwrap();
        let expected_projects_explicit = vec![Project {
            key: "explicit-proj".to_string(),
            name: "Explicit Org Project".to_string(),
        }];
        assert_eq!(list_result_explicit.projects, expected_projects_explicit);

        unsafe {
            match original_url {
                Some(url) => env::set_var(SONARQUBE_URL_ENV, url),
                None => env::remove_var(SONARQUBE_URL_ENV),
            }
            match original_token {
                Some(token) => env::set_var(SONARQUBE_TOKEN_ENV, token),
                None => env::remove_var(SONARQUBE_TOKEN_ENV),
            }
            match original_org {
                Some(org) => env::set_var(SONARQUBE_ORGANIZATION_ENV, org),
                None => env::remove_var(SONARQUBE_ORGANIZATION_ENV),
            }
        }

        // Use the cloned request for logging
        println!(
            "Request Parameters: organization = {:?}, page = {:?}, page_size = {:?}",
            request_clone.organization, request_clone.page, request_clone.page_size
        );
    }
}
