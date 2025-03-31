use serde::{Deserialize, Serialize};

/// Types for SonarQube API integration
///
/// This module contains the type definitions used for interacting with the SonarQube API.
/// It includes:
///
/// - Request and response structures that match the SonarQube API's JSON formats
/// - Parameter types for MCP tool calls related to SonarQube operations
/// - Result types that contain processed data from SonarQube API responses
/// - Error types for handling failures in SonarQube API operations
///
/// The types in this module are designed to provide a type-safe interface for
/// communicating with SonarQube servers, handling serialization/deserialization
/// of API requests and responses, and presenting the data in a format suitable
/// for consumption by MCP clients.
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

/// Conversion implementation from `serde_json::Error` to `SonarError`
///
/// This implementation enables seamless conversion from JSON parsing errors to our custom
/// SonarError type. It allows functions that parse JSON responses from the SonarQube API
/// to use the `?` operator for error propagation without explicit error conversions.
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
///
/// Represents the structure of a response from the SonarQube API's metrics endpoint.
/// This struct encapsulates the component with its associated metrics measurements,
/// which is the primary data returned when requesting metric values for a project.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MetricsResponse {
    /// The component (project) with its associated metric measurements
    pub component: ComponentMeasures,
}

/// Component with measures from SonarQube API
///
/// Represents a project or component in SonarQube along with its metric measurements.
/// This struct contains the component's identification information and a collection
/// of metric values that were measured during analysis.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ComponentMeasures {
    /// Unique identifier key for the component (project)
    pub key: String,
    /// Display name of the component (project)
    pub name: String,
    /// Collection of metric measurements for this component
    pub measures: Vec<Measure>,
}

/// Individual measure from SonarQube API
///
/// Represents a single metric measurement from SonarQube for a specific component.
/// Each measure contains the metric identifier, its measured value, and an optional
/// flag indicating whether this value is considered optimal for this metric type.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Measure {
    /// The identifier of the metric being measured (e.g., "complexity", "coverage")
    pub metric: String,
    /// The value of the metric, represented as a string to accommodate different metric types
    pub value: String,
    /// Indicates whether this value represents the best possible value for this metric
    #[serde(rename = "bestValue")]
    pub best_value: Option<bool>,
}

/// Response for issues from SonarQube API
///
/// Represents the complete response structure from the SonarQube API's issues endpoint.
/// This struct contains pagination information, the collection of issues found according
/// to the search criteria, and component information for each issue. It serves as the
/// primary container for issue data retrieved from SonarQube.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct IssuesResponse {
    /// Total number of issues matching the search criteria across all pages
    pub total: u32,
    /// Current page number (1-based)
    pub p: u32,
    /// Page size (number of issues per page)
    pub ps: u32,
    /// Detailed pagination information
    pub paging: Paging,
    /// Collection of issues returned in the current page
    pub issues: Vec<Issue>,
    /// Information about the components (files) where the issues were found
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
///
/// Represents a component (typically a file, directory, or project) in the SonarQube system.
/// Components are the core entities that SonarQube analyzes and for which it tracks quality metrics.
/// This struct contains basic identification and classification information about a component.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Component {
    /// Unique identifier key for the component in SonarQube
    pub key: String,
    /// Display name of the component
    pub name: String,
    /// Type qualifier indicating what kind of component this is (e.g., "TRK" for project, "FIL" for file)
    pub qualifier: String,
    /// Relative path to the component within its project (only relevant for file components)
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

/// Request parameters for getting metrics for a SonarQube project
#[derive(Debug, Deserialize, Serialize)]
pub struct SonarQubeMetricsRequest {
    /// Key of the project to get metrics for
    pub project_key: String,
    /// Optional list of specific metrics to retrieve
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

/// Request parameters for getting issues for a SonarQube project
#[derive(Debug, Deserialize, Serialize)]
pub struct SonarQubeIssuesRequest {
    /// Key of the project to get issues for
    pub project_key: String,
    /// Filter issues assigned to the authenticated user
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assigned_to_me: Option<bool>,
    /// List of assignee logins to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assignees: Option<Vec<String>>,
    /// List of issue authors to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub authors: Option<Vec<String>>,
    /// List of code variant identifiers to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_variants: Option<Vec<String>>,
    /// Filter issues created after the given date (format: YYYY-MM-DD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_after: Option<String>,
    /// Filter issues created before the given date (format: YYYY-MM-DD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_before: Option<String>,
    /// Filter issues created during a time span before now (e.g., '1m' for 1 month)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_in_last: Option<String>,
    /// List of CWE identifiers to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwe: Option<Vec<String>>,
    /// List of directories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directories: Option<Vec<String>>,
    /// List of facets to return in the response
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facets: Option<Vec<String>>,
    /// List of file paths to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub files: Option<Vec<String>>,
    /// List of impact severities to filter by (e.g., HIGH, MEDIUM, LOW)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impact_severities: Option<Vec<String>>,
    /// List of software qualities to filter by (e.g., MAINTAINABILITY, RELIABILITY, SECURITY)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impact_software_qualities: Option<Vec<String>>,
    /// List of issue statuses
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_statuses: Option<Vec<String>>,
    /// List of language keys to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<Vec<String>>,
    /// List of OWASP Top 10 categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owasp_top10: Option<Vec<String>>,
    /// List of OWASP Top 10 2021 categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owasp_top10_2021: Option<Vec<String>>,
    /// Page number
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<i32>,
    /// Page size
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_size: Option<i32>,
    /// List of issue resolutions to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolutions: Option<Vec<String>>,
    /// Filter resolved issues
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved: Option<bool>,
    /// List of rule keys to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rules: Option<Vec<String>>,
    /// List of SANS Top 25 categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sans_top25: Option<Vec<String>>,
    /// List of issue severities to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub severities: Option<Vec<String>>,
    /// List of SonarSource security categories to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sonarsource_security: Option<Vec<String>>,
    /// Field to sort by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_field: Option<String>,
    /// Sort ascending if true, descending if false
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asc: Option<bool>,
    /// List of issue statuses to filter by (e.g., OPEN, CONFIRMED, RESOLVED, CLOSED)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub statuses: Option<Vec<String>>,
    /// List of tags to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// List of issue types to filter by
    #[serde(skip_serializing_if = "Option::is_none")]
    pub types: Option<Vec<String>>,
}

/// Result for MCP sonarqube/get_issues tool
///
/// This struct represents the response structure returned by the MCP sonarqube/get_issues tool.
/// It contains pagination information and a collection of issues that match the filter criteria
/// specified in the request. The structure is designed to provide a clean and consistent
/// interface for MCP clients to consume SonarQube issue data.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeIssuesResult {
    /// Total number of issues matching the search criteria across all pages
    pub total: u32,
    /// Current page number (1-based)
    pub page: u32,
    /// Number of issues per page
    pub page_size: u32,
    /// Collection of issues returned in the current page
    pub issues: Vec<IssueInfo>,
}

/// Issue information for issues result
///
/// This struct represents a single issue or violation detected in SonarQube analysis.
/// It contains essential information about the issue, including its severity, location,
/// and status. This is a simplified version of the full Issue struct, containing only
/// the most relevant fields for display in MCP client interfaces.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct IssueInfo {
    /// Unique identifier for the issue
    pub key: String,
    /// Rule identifier that triggered this issue
    pub rule: String,
    /// Severity level of the issue (e.g., "BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO")
    pub severity: String,
    /// Key of the component (file) where the issue was detected
    pub component: String,
    /// Display name of the component (file) for easier readability
    pub component_name: Option<String>,
    /// Line number in the file where the issue occurs (None if not line-specific)
    pub line: Option<u32>,
    /// Description of the issue, explaining what the problem is
    pub message: String,
    /// Type of the issue (e.g., "BUG", "VULNERABILITY", "CODE_SMELL")
    pub issue_type: String,
    /// Current status of the issue (e.g., "OPEN", "CONFIRMED", "RESOLVED", "CLOSED")
    pub status: String,
}

/// Request parameters for getting quality gate status for a SonarQube project
#[derive(Debug, Deserialize, Serialize)]
pub struct SonarQubeQualityGateRequest {
    /// Key of the project to get quality gate status for
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

/// Request parameters for listing SonarQube projects
#[derive(Debug, Deserialize, Serialize)]
pub struct SonarQubeListProjectsRequest {
    /// Page number
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<i32>,
    /// Page size
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_size: Option<i32>,
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

/// Parameters for querying issues from the SonarQube API
#[derive(Debug, Clone, Default)]
pub struct IssuesQueryParams<'a> {
    /// The project key to fetch issues for (required)
    pub project_key: &'a str,
    /// Filter issues by severity levels (e.g., "BLOCKER", "CRITICAL", "MAJOR")
    pub severities: Option<&'a [&'a str]>,
    /// Filter issues by type (e.g., "BUG", "VULNERABILITY", "CODE_SMELL")
    pub types: Option<&'a [&'a str]>,
    /// Filter issues by status (e.g., "OPEN", "CONFIRMED", "RESOLVED", "CLOSED")
    pub statuses: Option<&'a [&'a str]>,
    /// If true, returns only issues assigned to the current authenticated user
    pub assigned_to_me: Option<bool>,
    /// Filter issues by assignee login names
    pub assignees: Option<&'a [&'a str]>,
    /// Filter issues by their author login names
    pub authors: Option<&'a [&'a str]>,
    /// Filter issues by code variant identifiers
    pub code_variants: Option<&'a [&'a str]>,
    /// Return issues created after this date (format: YYYY-MM-DD)
    pub created_after: Option<&'a str>,
    /// Return issues created before this date (format: YYYY-MM-DD)
    pub created_before: Option<&'a str>,
    /// Return issues created during a time span before now (e.g., "1m" for 1 month)
    pub created_in_last: Option<&'a str>,
    /// Filter issues by CWE (Common Weakness Enumeration) identifiers
    pub cwe: Option<&'a [&'a str]>,
    /// Filter issues by directories where the issues are located
    pub directories: Option<&'a [&'a str]>,
    /// Request additional facets in the response
    pub facets: Option<&'a [&'a str]>,
    /// Filter issues by file paths
    pub files: Option<&'a [&'a str]>,
    /// Filter issues by impact severity (e.g., "HIGH", "MEDIUM", "LOW")
    pub impact_severities: Option<&'a [&'a str]>,
    /// Filter issues by software quality impact (e.g., "MAINTAINABILITY", "RELIABILITY", "SECURITY")
    pub impact_software_qualities: Option<&'a [&'a str]>,
    /// Filter issues by specific status values (different from 'statuses')
    pub issue_statuses: Option<&'a [&'a str]>,
    /// Filter issues by programming language
    pub languages: Option<&'a [&'a str]>,
    /// Filter issues by OWASP Top 10 category
    pub owasp_top10: Option<&'a [&'a str]>,
    /// Filter issues by OWASP Top 10 2021 category
    pub owasp_top10_2021: Option<&'a [&'a str]>,
    /// Filter issues by resolution status (e.g., "FIXED", "FALSE-POSITIVE")
    pub resolutions: Option<&'a [&'a str]>,
    /// If true, returns only resolved issues
    pub resolved: Option<bool>,
    /// Filter issues by rule keys
    pub rules: Option<&'a [&'a str]>,
    /// Filter issues by SANS Top 25 category
    pub sans_top25: Option<&'a [&'a str]>,
    /// Filter issues by SonarSource security category
    pub sonarsource_security: Option<&'a [&'a str]>,
    /// Filter issues by tags
    pub tags: Option<&'a [&'a str]>,
    /// Field to sort results by
    pub sort_field: Option<&'a str>,
    /// If true, sort ascending; if false, sort descending
    pub asc: Option<bool>,
    /// Page number for pagination
    pub page: Option<u32>,
    /// Number of issues per page
    pub page_size: Option<u32>,
}

impl<'a> IssuesQueryParams<'a> {
    /// Creates a new instance of `IssuesQueryParams` with the specified project key
    ///
    /// This constructor initializes a new query parameters object with the minimum
    /// required parameter (project key) and sets all optional parameters to `None`.
    /// Use this method to start building a query, then set additional filter parameters
    /// as needed.
    ///
    /// # Arguments
    ///
    /// * `project_key` - The unique identifier key for the SonarQube project
    ///
    /// # Returns
    ///
    /// A new `IssuesQueryParams` instance with only the project key set
    pub fn new(project_key: &'a str) -> Self {
        Self {
            project_key,
            severities: None,
            types: None,
            statuses: None,
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
