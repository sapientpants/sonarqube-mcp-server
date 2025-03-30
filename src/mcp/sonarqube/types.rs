use rpc_router::RpcParams;
use serde::{Deserialize, Serialize};

/// Common error type for SonarQube-related operations
///
/// This enum provides a comprehensive set of error variants that can occur when
/// interacting with the SonarQube API. It implements the standard Error trait,
/// allowing for seamless integration with Rust's error handling mechanisms.
#[derive(Debug, thiserror::Error)]
pub enum SonarError {
    /// HTTP-level errors when making requests to the SonarQube API
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    /// Errors that occur when parsing JSON responses from the SonarQube API
    #[error("JSON parsing failed: {0}")]
    Parse(String),

    /// Errors returned by the SonarQube API itself (e.g., invalid request parameters)
    #[error("SonarQube API error: {0}")]
    Api(String),

    /// Authentication failures due to invalid or expired tokens
    #[error("Authentication failed")]
    AuthError,

    /// Errors when attempting to access a project that doesn't exist or the user doesn't have access to
    #[error("Project not found: {0}")]
    ProjectNotFound(String),

    /// Configuration-related errors (e.g., missing or invalid base URL or token)
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
///
/// Contains all necessary configuration parameters to establish a connection with
/// a SonarQube server. This includes the base URL, authentication token, and optional
/// organization identifier for SonarCloud or multi-organization instances.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeConfig {
    /// The base URL of the SonarQube server (e.g., "https://sonarcloud.io")
    pub base_url: String,
    /// Authentication token for accessing the SonarQube API
    pub token: String,
    /// Optional organization key for SonarCloud or multi-organization SonarQube instances
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
///
/// Contains pagination metadata for SonarQube API responses that return collections of items,
/// such as issues, projects, etc. This struct is used to track the current page, page size,
/// and total number of items available across all pages.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Paging {
    /// Current page index (1-based)
    #[serde(rename = "pageIndex")]
    pub page_index: u32,
    /// Number of items per page
    #[serde(rename = "pageSize")]
    pub page_size: u32,
    /// Total number of items available across all pages
    pub total: u32,
}

/// Individual issue from SonarQube API
///
/// Represents a detected issue or violation in SonarQube that needs to be addressed.
/// Issues can represent bugs, vulnerabilities, code smells, or other quality problems
/// identified during analysis.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Issue {
    /// Unique identifier for the issue
    pub key: String,
    /// Rule identifier that triggered this issue
    pub rule: String,
    /// Severity level of the issue (e.g., "BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO")
    pub severity: String,
    /// Key of the component (file) where the issue was detected
    pub component: String,
    /// Key of the project containing the issue
    pub project: String,
    /// Line number in the file where the issue occurs (None if not line-specific)
    pub line: Option<u32>,
    /// Description of the issue, explaining what the problem is
    pub message: String,
    /// Type of the issue (e.g., "BUG", "VULNERABILITY", "CODE_SMELL")
    #[serde(rename = "type")]
    pub issue_type: String,
    /// Current status of the issue (e.g., "OPEN", "CONFIRMED", "RESOLVED", "CLOSED")
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
///
/// Represents the response structure from the SonarQube API when querying
/// the quality gate status of a project. Contains the detailed project status
/// with information about the quality gate evaluation.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct QualityGateResponse {
    /// Project status details containing the overall quality gate status and conditions
    #[serde(rename = "projectStatus")]
    pub project_status: ProjectStatus,
}

/// Project status in quality gate response
///
/// Contains detailed information about a project's quality gate status,
/// including the overall status (e.g., "OK", "ERROR") and a list of specific
/// conditions that were evaluated as part of the quality gate.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectStatus {
    /// Overall status of the quality gate (e.g., "OK", "ERROR")
    pub status: String,
    /// List of conditions that were evaluated as part of the quality gate check
    pub conditions: Vec<Condition>,
}

/// Quality gate condition in quality gate response
///
/// Represents an individual condition that is part of a SonarQube quality gate.
/// Each condition evaluates a specific metric against a threshold using a comparator.
/// The status field indicates whether this specific condition has passed.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Condition {
    /// Key of the metric being evaluated (e.g., "new_coverage", "new_bugs")
    #[serde(rename = "metricKey")]
    pub metric_key: String,
    /// Comparison operator used for evaluation (e.g., "GT", "LT")
    #[serde(rename = "comparator")]
    pub comparator: String,
    /// Period index for the condition evaluation (if applicable)
    #[serde(rename = "periodIndex")]
    pub period_index: Option<u32>,
    /// Threshold value that triggers an error when crossed
    #[serde(rename = "errorThreshold")]
    pub error_threshold: String,
    /// Actual measured value of the metric in the project
    #[serde(rename = "actualValue")]
    pub actual_value: String,
    /// Status of this condition (e.g., "OK", "ERROR")
    pub status: String,
}

/// Request parameters for MCP sonarqube/get_metrics tool
///
/// Contains the parameters needed to request metrics data from the SonarQube
/// API for a specific project. This structure supports both retrieving all
/// available metrics and filtering to a specific set of metrics through the
/// optional `metrics` field.
#[derive(Debug, Clone, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeMetricsRequest {
    /// The unique key identifier for the SonarQube project
    pub project_key: String,
    /// Optional list of specific metric keys to retrieve. If not provided, all available metrics will be returned.
    pub metrics: Option<Vec<String>>,
}

/// Result for MCP sonarqube/get_metrics tool
///
/// Contains the response data for a metrics request, including the project
/// identification information and a collection of metric values. This struct
/// represents the processed result of a SonarQube metrics API call, formatted
/// for consumption by MCP client applications.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeMetricsResult {
    /// The display name of the project
    pub project_name: String,
    /// The unique key identifier for the SonarQube project
    pub project_key: String,
    /// Collection of metric values retrieved from SonarQube
    pub metrics: Vec<MetricValue>,
}

/// Individual metric value for metrics result
///
/// Represents a single metric measurement from SonarQube, containing
/// the metric key, its value, and an optional indication of whether
/// this value is considered the "best value" possible for this metric.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MetricValue {
    /// The unique identifier of the metric (e.g., "complexity", "coverage", "bugs")
    pub key: String,
    /// The value of the metric, represented as a string to accommodate different metric types
    pub value: String,
    /// Indicates whether this value represents the best possible value for this metric
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
///
/// Represents a SonarQube project entity with its key properties.
/// This struct contains information about a project or module within SonarQube,
/// including its unique identifier, name, description, and analysis information.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Project {
    /// Unique identifier key for the project
    pub key: String,
    /// Display name of the project
    pub name: String,
    /// Optional description of the project's purpose or contents
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Type qualifier for the component (e.g., "TRK" for project, "BRC" for subproject)
    pub qualifier: String,
    /// Visibility setting of the project (e.g., "public" or "private")
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visibility: Option<String>,
    /// ISO-formatted date string of when the project was last analyzed
    #[serde(rename = "lastAnalysisDate")]
    pub last_analysis_date: Option<String>,
}

/// API response for projects list from SonarQube
///
/// Represents the response structure from the SonarQube API when listing projects.
/// This struct contains pagination information and a collection of projects returned
/// from the API. It's used to deserialize responses from the SonarQube 'projects/search'
/// endpoint.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectsResponse {
    /// Pagination metadata for the response
    pub paging: Paging,
    /// Collection of projects returned in this page of results
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
