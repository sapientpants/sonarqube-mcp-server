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

/// Request parameters for MCP sonarqube/get_issues tool
#[derive(Debug, Clone, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeIssuesRequest {
    pub project_key: String,
    pub severities: Option<Vec<String>>,
    pub types: Option<Vec<String>>,
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
#[derive(Debug, Clone, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeQualityGateRequest {
    pub project_key: String,
}

/// Result for MCP sonarqube/get_quality_gate tool
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeQualityGateResult {
    pub status: String,
    pub passes_quality_gate: bool,
    pub conditions: Vec<QualityGateCondition>,
}

/// Quality gate condition for quality gate result
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct QualityGateCondition {
    pub metric: String,
    pub comparator: String,
    pub threshold: String,
    pub actual_value: String,
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
#[derive(Debug, Deserialize, Serialize, RpcParams)]
pub struct SonarQubeListProjectsRequest {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub organization: Option<String>,
}

/// Result for MCP sonarqube/list_projects tool
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SonarQubeListProjectsResult {
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub projects: Vec<Project>,
}
