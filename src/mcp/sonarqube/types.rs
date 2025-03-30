use rpc_router::RpcParams;
use serde::{Deserialize, Serialize};

/// Common error type for SonarQube-related operations
#[derive(Debug, thiserror::Error)]
pub enum SonarError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JSON parsing failed: {0}")]
    Parse(String),

    #[error("SonarQube API error: {0}")]
    Api(String),

    #[error("Authentication failed")]
    AuthError,

    #[error("Project not found: {0}")]
    ProjectNotFound(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

// Add an implementation to convert serde_json::Error to SonarError
impl From<serde_json::Error> for SonarError {
    fn from(err: serde_json::Error) -> Self {
        SonarError::Parse(err.to_string())
    }
}

/// Configuration for SonarQube API client
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeConfig {
    pub base_url: String,
    pub token: String,
    pub organization: Option<String>,
}

/// Response for metrics from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MetricsResponse {
    pub component: ComponentMeasures,
}

/// Component with measures from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ComponentMeasures {
    pub key: String,
    pub name: String,
    pub measures: Vec<Measure>,
}

/// Individual measure from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Measure {
    pub metric: String,
    pub value: String,
    #[serde(rename = "bestValue")]
    pub best_value: Option<bool>,
}

/// Response for issues from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct IssuesResponse {
    pub total: u32,
    pub p: u32,
    pub ps: u32,
    pub paging: Paging,
    pub issues: Vec<Issue>,
    pub components: Vec<Component>,
}

/// Paging information for issues response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Paging {
    #[serde(rename = "pageIndex")]
    pub page_index: u32,
    #[serde(rename = "pageSize")]
    pub page_size: u32,
    pub total: u32,
}

/// Individual issue from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Issue {
    pub key: String,
    pub rule: String,
    pub severity: String,
    pub component: String,
    pub project: String,
    pub line: Option<u32>,
    pub message: String,
    #[serde(rename = "type")]
    pub issue_type: String,
    pub status: String,
}

/// Component information from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Component {
    pub key: String,
    pub name: String,
    pub qualifier: String,
    pub path: Option<String>,
}

/// Quality gate status response from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct QualityGateResponse {
    #[serde(rename = "projectStatus")]
    pub project_status: ProjectStatus,
}

/// Project status in quality gate response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectStatus {
    pub status: String,
    pub conditions: Vec<Condition>,
}

/// Quality gate condition in quality gate response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Condition {
    #[serde(rename = "metricKey")]
    pub metric_key: String,
    #[serde(rename = "comparator")]
    pub comparator: String,
    #[serde(rename = "periodIndex")]
    pub period_index: Option<u32>,
    #[serde(rename = "errorThreshold")]
    pub error_threshold: String,
    #[serde(rename = "actualValue")]
    pub actual_value: String,
    pub status: String,
}

/// Request parameters for MCP sonarqube/get_metrics tool
#[derive(Debug, Clone, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeMetricsRequest {
    pub project_key: String,
    pub metrics: Option<Vec<String>>,
}

/// Result for MCP sonarqube/get_metrics tool
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeMetricsResult {
    pub project_name: String,
    pub project_key: String,
    pub metrics: Vec<MetricValue>,
}

/// Individual metric value for metrics result
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MetricValue {
    pub key: String,
    pub value: String,
    pub best_value: Option<bool>,
}

/// Parameters for querying issues from the SonarQube API
#[derive(Debug, Clone, Default)]
pub struct IssuesQueryParams<'a> {
    pub project_key: &'a str,
    pub severities: Option<&'a [&'a str]>,
    pub types: Option<&'a [&'a str]>,
    pub statuses: Option<&'a [&'a str]>,
    pub impact_severities: Option<&'a [&'a str]>,
    pub impact_software_qualities: Option<&'a [&'a str]>,
    pub assigned_to_me: Option<bool>,
    pub assignees: Option<&'a [&'a str]>,
    pub authors: Option<&'a [&'a str]>,
    pub code_variants: Option<&'a [&'a str]>,
    pub created_after: Option<&'a str>,
    pub created_before: Option<&'a str>,
    pub created_in_last: Option<&'a str>,
    pub cwe: Option<&'a [&'a str]>,
    pub directories: Option<&'a [&'a str]>,
    pub facets: Option<&'a [&'a str]>,
    pub files: Option<&'a [&'a str]>,
    pub issue_statuses: Option<&'a [&'a str]>,
    pub languages: Option<&'a [&'a str]>,
    pub owasp_top10: Option<&'a [&'a str]>,
    pub owasp_top10_2021: Option<&'a [&'a str]>,
    pub resolutions: Option<&'a [&'a str]>,
    pub resolved: Option<bool>,
    pub rules: Option<&'a [&'a str]>,
    pub sans_top25: Option<&'a [&'a str]>,
    pub sonarsource_security: Option<&'a [&'a str]>,
    pub tags: Option<&'a [&'a str]>,
    pub sort_field: Option<&'a str>,
    pub asc: Option<bool>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

impl<'a> IssuesQueryParams<'a> {
    pub fn new(project_key: &'a str) -> Self {
        Self {
            project_key,
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
        }
    }
}

/// Request parameters for MCP sonarqube/get_issues tool
#[derive(Debug, Clone, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeIssuesRequest {
    pub project_key: String,
    pub severities: Option<Vec<String>>,
    pub types: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
    pub impact_severities: Option<Vec<String>>,
    pub impact_software_qualities: Option<Vec<String>>,
    pub assigned_to_me: Option<bool>,
    pub assignees: Option<Vec<String>>,
    pub authors: Option<Vec<String>>,
    pub code_variants: Option<Vec<String>>,
    pub created_after: Option<String>,
    pub created_before: Option<String>,
    pub created_in_last: Option<String>,
    pub cwe: Option<Vec<String>>,
    pub directories: Option<Vec<String>>,
    pub facets: Option<Vec<String>>,
    pub files: Option<Vec<String>>,
    pub issue_statuses: Option<Vec<String>>,
    pub languages: Option<Vec<String>>,
    pub owasp_top10: Option<Vec<String>>,
    pub owasp_top10_2021: Option<Vec<String>>,
    pub resolutions: Option<Vec<String>>,
    pub resolved: Option<bool>,
    pub rules: Option<Vec<String>>,
    pub sans_top25: Option<Vec<String>>,
    pub sonarsource_security: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub sort_field: Option<String>,
    pub asc: Option<bool>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

/// Result for MCP sonarqube/get_issues tool
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeIssuesResult {
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub issues: Vec<IssueInfo>,
}

/// Issue information for issues result
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct IssueInfo {
    pub key: String,
    pub rule: String,
    pub severity: String,
    pub component: String,
    pub component_name: Option<String>,
    pub line: Option<u32>,
    pub message: String,
    pub issue_type: String,
    pub status: String,
}

/// Request parameters for MCP sonarqube/get_quality_gate tool
///
/// Contains the parameters needed to request quality gate information
/// for a specific SonarQube project.
#[derive(Debug, Clone, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeQualityGateRequest {
    /// The unique key identifier for the SonarQube project
    pub project_key: String,
}

/// Result for MCP sonarqube/get_quality_gate tool
///
/// Contains quality gate status information for a SonarQube project,
/// including overall status and detailed conditions that make up the quality gate.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeQualityGateResult {
    /// Overall status of the quality gate (e.g., "OK", "ERROR")
    pub status: String,
    /// Boolean indicating whether the project passes the quality gate
    pub passes_quality_gate: bool,
    /// List of conditions that make up the quality gate evaluation
    pub conditions: Vec<QualityGateCondition>,
}

/// Quality gate condition for quality gate result
///
/// Represents a single condition in a SonarQube quality gate evaluation,
/// containing information about the metric being evaluated, its threshold,
/// and the actual value of the metric.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct QualityGateCondition {
    /// Name of the metric being evaluated (e.g., "new_coverage", "new_bugs")
    pub metric: String,
    /// Comparison operator used for evaluation (e.g., "GT", "LT")
    pub comparator: String,
    /// Threshold value that the metric is compared against
    pub threshold: String,
    /// Actual value of the metric in the project
    pub actual_value: String,
    /// Status of this specific condition (e.g., "OK", "ERROR")
    pub status: String,
}

/// Project information from SonarQube API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Project {
    pub key: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub qualifier: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visibility: Option<String>,
    #[serde(rename = "lastAnalysisDate")]
    pub last_analysis_date: Option<String>,
}

/// API response for projects list from SonarQube
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectsResponse {
    pub paging: Paging,
    pub components: Vec<Project>,
}

/// Request parameters for MCP sonarqube/list_projects tool
///
/// This struct contains optional parameters that can be used to control pagination
/// when listing SonarQube projects.
#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeListProjectsRequest {
    /// Page number for pagination (optional)
    pub page: Option<u32>,
    /// Number of items per page (optional)
    pub page_size: Option<u32>,
}

/// Result type for the SonarQube list projects operation
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeListProjectsResult {
    /// Total number of projects available
    pub total: u32,
    /// Current page number
    pub page: u32,
    /// Number of items per page
    pub page_size: u32,
    /// List of projects in the current page
    pub projects: Vec<Project>,
}
