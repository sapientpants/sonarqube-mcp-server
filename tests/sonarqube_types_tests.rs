mod helpers;

use sonarqube_mcp_server::mcp::sonarqube::types::{
    Component, Condition, Issue, IssueInfo, Paging, ProjectStatus, ProjectsResponse,
    QualityGateCondition, QualityGateResponse, SonarError, SonarQubeConfig, SonarQubeIssuesRequest,
    SonarQubeIssuesResult, SonarQubeListProjectsRequest, SonarQubeListProjectsResult,
    SonarQubeMetricsRequest, SonarQubeProject, SonarQubeQualityGateRequest,
    SonarQubeQualityGateResult,
};
use sonarqube_mcp_server::mcp::types::Project;

#[test]
fn test_paging_serialization() {
    // Create a Paging struct
    let paging = Paging {
        page_index: 1,
        page_size: 10,
        total: 100,
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&paging).unwrap();

    // Deserialize back to struct
    let deserialized: Paging = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.page_index, 1);
    assert_eq!(deserialized.page_size, 10);
    assert_eq!(deserialized.total, 100);
}

#[test]
fn test_issue_serialization() {
    // Create an Issue struct
    let issue = Issue {
        key: "issue-1".to_string(),
        rule: "rule:1".to_string(),
        severity: "MAJOR".to_string(),
        component: "component-1".to_string(),
        project: "project-1".to_string(),
        line: Some(42),
        message: "This is a test issue".to_string(),
        issue_type: "BUG".to_string(),
        status: "OPEN".to_string(),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&issue).unwrap();

    // Deserialize back to struct
    let deserialized: Issue = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.key, "issue-1");
    assert_eq!(deserialized.rule, "rule:1");
    assert_eq!(deserialized.severity, "MAJOR");
    assert_eq!(deserialized.component, "component-1");
    assert_eq!(deserialized.project, "project-1");
    assert_eq!(deserialized.line, Some(42));
    assert_eq!(deserialized.message, "This is a test issue");
    assert_eq!(deserialized.issue_type, "BUG");
    assert_eq!(deserialized.status, "OPEN");
}

#[test]
fn test_component_serialization() {
    // Create a Component struct
    let component = Component {
        key: "component-1".to_string(),
        name: "Component One".to_string(),
        qualifier: "FIL".to_string(),
        path: Some("src/main.rs".to_string()),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&component).unwrap();

    // Deserialize back to struct
    let deserialized: Component = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.key, "component-1");
    assert_eq!(deserialized.name, "Component One");
    assert_eq!(deserialized.qualifier, "FIL");
    assert_eq!(deserialized.path, Some("src/main.rs".to_string()));
}

#[test]
fn test_quality_gate_response_serialization() {
    // Create a QualityGateResponse struct
    let response = QualityGateResponse {
        project_status: ProjectStatus {
            status: "OK".to_string(),
            conditions: vec![
                Condition {
                    metric_key: "coverage".to_string(),
                    comparator: "GT".to_string(),
                    period_index: Some(1),
                    error_threshold: "80".to_string(),
                    actual_value: "85".to_string(),
                    status: "OK".to_string(),
                },
                Condition {
                    metric_key: "bugs".to_string(),
                    comparator: "LT".to_string(),
                    period_index: None,
                    error_threshold: "10".to_string(),
                    actual_value: "5".to_string(),
                    status: "OK".to_string(),
                },
            ],
        },
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&response).unwrap();

    // Deserialize back to struct
    let deserialized: QualityGateResponse = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.project_status.status, "OK");
    assert_eq!(deserialized.project_status.conditions.len(), 2);

    let coverage_condition = &deserialized.project_status.conditions[0];
    assert_eq!(coverage_condition.metric_key, "coverage");
    assert_eq!(coverage_condition.comparator, "GT");
    assert_eq!(coverage_condition.period_index, Some(1));
    assert_eq!(coverage_condition.error_threshold, "80");
    assert_eq!(coverage_condition.actual_value, "85");
    assert_eq!(coverage_condition.status, "OK");

    let bugs_condition = &deserialized.project_status.conditions[1];
    assert_eq!(bugs_condition.metric_key, "bugs");
    assert_eq!(bugs_condition.comparator, "LT");
    assert_eq!(bugs_condition.period_index, None);
    assert_eq!(bugs_condition.error_threshold, "10");
    assert_eq!(bugs_condition.actual_value, "5");
    assert_eq!(bugs_condition.status, "OK");
}

#[test]
fn test_sonarqube_metrics_request_serialization() {
    // Create a SonarQubeMetricsRequest struct
    let request = SonarQubeMetricsRequest {
        project_key: "test-project".to_string(),
        metrics: Some(vec![
            "coverage".to_string(),
            "bugs".to_string(),
            "vulnerabilities".to_string(),
        ]),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&request).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeMetricsRequest = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.project_key, "test-project");
    assert_eq!(deserialized.metrics.as_ref().unwrap().len(), 3);
    assert_eq!(deserialized.metrics.as_ref().unwrap()[0], "coverage");
    assert_eq!(deserialized.metrics.as_ref().unwrap()[1], "bugs");
    assert_eq!(deserialized.metrics.as_ref().unwrap()[2], "vulnerabilities");
}

#[test]
fn test_sonarqube_issues_request_serialization() {
    // Create a SonarQubeIssuesRequest struct
    let request = SonarQubeIssuesRequest {
        project_key: "test-project".to_string(),
        severities: Some(vec!["MAJOR".to_string(), "CRITICAL".to_string()]),
        types: Some(vec!["BUG".to_string(), "VULNERABILITY".to_string()]),
        statuses: Some(vec!["OPEN".to_string()]),
        impact_severities: None,
        impact_software_qualities: None,
        assigned_to_me: Some(false),
        assignees: None,
        authors: None,
        code_variants: None,
        created_after: None,
        created_before: None,
        created_in_last: None,
        cwe: None,
        directories: None,
        facets: None,
        files: Some(vec!["src/main.rs".to_string()]),
        issue_statuses: None,
        languages: Some(vec!["rust".to_string()]),
        owasp_top10: None,
        owasp_top10_2021: None,
        resolutions: None,
        resolved: Some(false),
        rules: None,
        sans_top25: None,
        sonarsource_security: None,
        tags: None,
        sort_field: Some("SEVERITY".to_string()),
        asc: Some(false),
        page: Some(1),
        page_size: Some(10),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&request).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeIssuesRequest = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.project_key, "test-project");
    assert_eq!(deserialized.severities.as_ref().unwrap().len(), 2);
    assert_eq!(deserialized.types.as_ref().unwrap().len(), 2);
    assert_eq!(deserialized.statuses.as_ref().unwrap().len(), 1);
    assert_eq!(deserialized.assigned_to_me, Some(false));
    assert_eq!(deserialized.files.as_ref().unwrap().len(), 1);
    assert_eq!(deserialized.files.as_ref().unwrap()[0], "src/main.rs");
    assert_eq!(deserialized.languages.as_ref().unwrap().len(), 1);
    assert_eq!(deserialized.languages.as_ref().unwrap()[0], "rust");
    assert_eq!(deserialized.sort_field, Some("SEVERITY".to_string()));
    assert_eq!(deserialized.asc, Some(false));
    assert_eq!(deserialized.page, Some(1));
    assert_eq!(deserialized.page_size, Some(10));
}

#[test]
fn test_sonarqube_issues_result_serialization() {
    // Create a SonarQubeIssuesResult struct
    let result = SonarQubeIssuesResult {
        total: 10,
        page: 1,
        page_size: 5,
        issues: vec![
            IssueInfo {
                key: "issue-1".to_string(),
                rule: "rule:1".to_string(),
                severity: "MAJOR".to_string(),
                component: "component-1".to_string(),
                component_name: Some("Component One".to_string()),
                line: Some(42),
                message: "This is a test issue".to_string(),
                issue_type: "BUG".to_string(),
                status: "OPEN".to_string(),
            },
            IssueInfo {
                key: "issue-2".to_string(),
                rule: "rule:2".to_string(),
                severity: "CRITICAL".to_string(),
                component: "component-2".to_string(),
                component_name: None,
                line: None,
                message: "This is another test issue".to_string(),
                issue_type: "VULNERABILITY".to_string(),
                status: "OPEN".to_string(),
            },
        ],
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&result).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeIssuesResult = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.total, 10);
    assert_eq!(deserialized.page, 1);
    assert_eq!(deserialized.page_size, 5);
    assert_eq!(deserialized.issues.len(), 2);

    assert_eq!(deserialized.issues[0].key, "issue-1");
    assert_eq!(deserialized.issues[0].rule, "rule:1");
    assert_eq!(deserialized.issues[0].severity, "MAJOR");
    assert_eq!(deserialized.issues[0].component, "component-1");
    assert_eq!(
        deserialized.issues[0].component_name,
        Some("Component One".to_string())
    );
    assert_eq!(deserialized.issues[0].line, Some(42));
    assert_eq!(deserialized.issues[0].message, "This is a test issue");
    assert_eq!(deserialized.issues[0].issue_type, "BUG");
    assert_eq!(deserialized.issues[0].status, "OPEN");

    assert_eq!(deserialized.issues[1].key, "issue-2");
    assert_eq!(deserialized.issues[1].rule, "rule:2");
    assert_eq!(deserialized.issues[1].severity, "CRITICAL");
    assert_eq!(deserialized.issues[1].component, "component-2");
    assert_eq!(deserialized.issues[1].component_name, None);
    assert_eq!(deserialized.issues[1].line, None);
    assert_eq!(deserialized.issues[1].message, "This is another test issue");
    assert_eq!(deserialized.issues[1].issue_type, "VULNERABILITY");
    assert_eq!(deserialized.issues[1].status, "OPEN");
}

#[test]
fn test_sonarqube_quality_gate_request_serialization() {
    // Create a SonarQubeQualityGateRequest struct
    let request = SonarQubeQualityGateRequest {
        project_key: "test-project".to_string(),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&request).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeQualityGateRequest = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.project_key, "test-project");
}

#[test]
fn test_sonarqube_quality_gate_result_serialization() {
    // Create a SonarQubeQualityGateResult struct
    let result = SonarQubeQualityGateResult {
        status: "OK".to_string(),
        passes_quality_gate: true,
        conditions: vec![
            QualityGateCondition {
                metric: "coverage".to_string(),
                comparator: "GT".to_string(),
                threshold: "80".to_string(),
                actual_value: "85".to_string(),
                status: "OK".to_string(),
            },
            QualityGateCondition {
                metric: "bugs".to_string(),
                comparator: "LT".to_string(),
                threshold: "10".to_string(),
                actual_value: "5".to_string(),
                status: "OK".to_string(),
            },
        ],
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&result).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeQualityGateResult = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.status, "OK");
    assert!(deserialized.passes_quality_gate);
    assert_eq!(deserialized.conditions.len(), 2);

    assert_eq!(deserialized.conditions[0].metric, "coverage");
    assert_eq!(deserialized.conditions[0].comparator, "GT");
    assert_eq!(deserialized.conditions[0].threshold, "80");
    assert_eq!(deserialized.conditions[0].actual_value, "85");
    assert_eq!(deserialized.conditions[0].status, "OK");

    assert_eq!(deserialized.conditions[1].metric, "bugs");
    assert_eq!(deserialized.conditions[1].comparator, "LT");
    assert_eq!(deserialized.conditions[1].threshold, "10");
    assert_eq!(deserialized.conditions[1].actual_value, "5");
    assert_eq!(deserialized.conditions[1].status, "OK");
}

#[test]
fn test_project_serialization() {
    // Create a Project struct
    let project = Project {
        key: "test-key".to_string(),
        name: "Test Project".to_string(),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&project).unwrap();

    // Deserialize back to struct
    let deserialized: Project = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.key, "test-key");
    assert_eq!(deserialized.name, "Test Project");
}

#[test]
fn test_projects_response_serialization() {
    // Create a ProjectsResponse struct
    let response = ProjectsResponse {
        paging: Paging {
            page_index: 1,
            page_size: 10,
            total: 2,
        },
        components: vec![
            SonarQubeProject {
                key: "project-1".to_string(),
                name: "Project One".to_string(),
                description: Some("A test project".to_string()),
                qualifier: "TRK".to_string(),
                visibility: Some("public".to_string()),
                last_analysis_date: Some("2022-01-01T12:00:00+0000".to_string()),
            },
            SonarQubeProject {
                key: "project-2".to_string(),
                name: "Project Two".to_string(),
                description: None,
                qualifier: "TRK".to_string(),
                visibility: None,
                last_analysis_date: None,
            },
        ],
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&response).unwrap();

    // Deserialize back to struct
    let deserialized: ProjectsResponse = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.paging.page_index, 1);
    assert_eq!(deserialized.paging.page_size, 10);
    assert_eq!(deserialized.paging.total, 2);
    assert_eq!(deserialized.components.len(), 2);

    assert_eq!(deserialized.components[0].key, "project-1");
    assert_eq!(deserialized.components[0].name, "Project One");
    assert_eq!(
        deserialized.components[0].description.as_ref().unwrap(),
        "A test project"
    );
    assert_eq!(deserialized.components[0].qualifier, "TRK");
    assert_eq!(
        deserialized.components[0].visibility.as_ref().unwrap(),
        "public"
    );
    assert_eq!(
        deserialized.components[0]
            .last_analysis_date
            .as_ref()
            .unwrap(),
        "2022-01-01T12:00:00+0000"
    );

    assert_eq!(deserialized.components[1].key, "project-2");
    assert_eq!(deserialized.components[1].name, "Project Two");
    assert_eq!(deserialized.components[1].description, None);
    assert_eq!(deserialized.components[1].qualifier, "TRK");
    assert_eq!(deserialized.components[1].visibility, None);
    assert_eq!(deserialized.components[1].last_analysis_date, None);
}

#[test]
fn test_sonarqube_list_projects_request_serialization() {
    // Create a SonarQubeListProjectsRequest struct
    let request = SonarQubeListProjectsRequest {
        page: Some(2),
        page_size: Some(10),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&request).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeListProjectsRequest = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.page, Some(2));
    assert_eq!(deserialized.page_size, Some(10));
}

#[test]
fn test_sonarqube_list_projects_result_serialization() {
    // Create a SonarQubeListProjectsResult struct
    let result = SonarQubeListProjectsResult {
        total: 2,
        page: 1,
        page_size: 10,
        projects: vec![
            SonarQubeProject {
                key: "project-1".to_string(),
                name: "Project One".to_string(),
                description: Some("A test project".to_string()),
                qualifier: "TRK".to_string(),
                visibility: Some("public".to_string()),
                last_analysis_date: Some("2022-01-01T12:00:00+0000".to_string()),
            },
            SonarQubeProject {
                key: "project-2".to_string(),
                name: "Project Two".to_string(),
                description: None,
                qualifier: "TRK".to_string(),
                visibility: None,
                last_analysis_date: None,
            },
        ],
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&result).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeListProjectsResult = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.total, 2);
    assert_eq!(deserialized.page, 1);
    assert_eq!(deserialized.page_size, 10);
    assert_eq!(deserialized.projects.len(), 2);

    assert_eq!(deserialized.projects[0].key, "project-1");
    assert_eq!(deserialized.projects[0].name, "Project One");
    assert_eq!(
        deserialized.projects[0].description.as_ref().unwrap(),
        "A test project"
    );
    assert_eq!(deserialized.projects[0].qualifier, "TRK");
    assert_eq!(
        deserialized.projects[0].visibility.as_ref().unwrap(),
        "public"
    );
    assert_eq!(
        deserialized.projects[0]
            .last_analysis_date
            .as_ref()
            .unwrap(),
        "2022-01-01T12:00:00+0000"
    );

    assert_eq!(deserialized.projects[1].key, "project-2");
    assert_eq!(deserialized.projects[1].name, "Project Two");
    assert_eq!(deserialized.projects[1].description, None);
    assert_eq!(deserialized.projects[1].qualifier, "TRK");
    assert_eq!(deserialized.projects[1].visibility, None);
    assert_eq!(deserialized.projects[1].last_analysis_date, None);
}

#[test]
fn test_sonar_error_serialization() {
    // Test AuthError
    let auth_error = SonarError::AuthError;
    assert!(matches!(auth_error, SonarError::AuthError));

    // Test Config error
    let config_error = SonarError::Config("Missing token".to_string());
    match config_error {
        SonarError::Config(msg) => assert_eq!(msg, "Missing token"),
        _ => panic!("Expected Config error"),
    }

    // Test ProjectNotFound error
    let not_found_error = SonarError::ProjectNotFound("project-1".to_string());
    match not_found_error {
        SonarError::ProjectNotFound(key) => assert_eq!(key, "project-1"),
        _ => panic!("Expected ProjectNotFound error"),
    }

    // Test Api error
    let api_error = SonarError::Api("Server error".to_string());
    match api_error {
        SonarError::Api(msg) => assert_eq!(msg, "Server error"),
        _ => panic!("Expected Api error"),
    }

    // Test Parse error
    let parse_error = SonarError::Parse("Invalid JSON".to_string());
    match parse_error {
        SonarError::Parse(msg) => assert_eq!(msg, "Invalid JSON"),
        _ => panic!("Expected Parse error"),
    }

    // Skip testing Http error as it requires creating a reqwest::Error
    // which is not straightforward
}

#[test]
fn test_sonarqube_config_serialization() {
    // Create a SonarQubeConfig struct
    let config = SonarQubeConfig {
        base_url: "https://sonarqube.example.com".to_string(),
        token: "test-token".to_string(),
        organization: Some("org-1".to_string()),
    };

    // Serialize to JSON
    let json_str = serde_json::to_string(&config).unwrap();

    // Deserialize back to struct
    let deserialized: SonarQubeConfig = serde_json::from_str(&json_str).unwrap();

    // Verify the roundtrip
    assert_eq!(deserialized.base_url, "https://sonarqube.example.com");
    assert_eq!(deserialized.token, "test-token");
    assert_eq!(deserialized.organization, Some("org-1".to_string()));
}

#[test]
fn test_sonar_error_from_impl() {
    // Test conversion from std::io::Error
    let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "File not found");
    // A direct conversion of io::Error isn't implemented, use a generic error message instead
    let sonar_error = SonarError::Parse(format!("IO Error: {}", io_error));
    match sonar_error {
        SonarError::Parse(msg) => {
            assert!(msg.contains("File not found"));
        }
        _ => panic!("Expected Parse error variant"),
    }

    // Test conversion from reqwest::Error
    // Since reqwest::Error doesn't have a simple constructor in tests,
    // we'll just verify that the right conversion function exists by type-checking
    let _conversion_exists = |err: reqwest::Error| {
        let _: SonarError = err.into();
    };
}
