variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_name" {
  description = "Name prefix for resources"
  type        = string
  default     = "sonarqube-mcp"
}

variable "namespace" {
  description = "Kubernetes namespace to deploy into"
  type        = string
  default     = "sonarqube-mcp"
}

variable "service_account_name" {
  description = "Name of the Kubernetes service account"
  type        = string
  default     = "sonarqube-mcp"
}

variable "sonarqube_base_url" {
  description = "Base URL of your SonarQube instance"
  type        = string
}

variable "sonarqube_token" {
  description = "SonarQube authentication token"
  type        = string
  sensitive   = true
}

variable "ingress_host" {
  description = "Hostname for the ingress"
  type        = string
}

variable "oauth_issuer" {
  description = "OAuth 2.0 issuer URL"
  type        = string
}

variable "oauth_audience" {
  description = "OAuth 2.0 audience"
  type        = string
  default     = "sonarqube-mcp"
}

variable "helm_repository" {
  description = "Helm chart repository URL"
  type        = string
  default     = "https://charts.sonarqube-mcp.io"
}

variable "helm_chart" {
  description = "Helm chart name"
  type        = string
  default     = "sonarqube-mcp"
}

variable "helm_chart_version" {
  description = "Helm chart version"
  type        = string
  default     = "0.1.0"
}

variable "helm_values" {
  description = "Additional Helm values to set"
  type        = map(string)
  default     = {}
}

variable "enable_alb_ingress" {
  description = "Enable AWS ALB ingress controller"
  type        = bool
  default     = true
}

variable "alb_scheme" {
  description = "ALB scheme (internet-facing or internal)"
  type        = string
  default     = "internet-facing"
}

variable "alb_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
}

variable "alb_group_name" {
  description = "ALB group name for shared ALB"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "Hosted zone ID for ALB (region-specific)"
  type        = string
  default     = ""
}

variable "enable_route53" {
  description = "Create Route53 DNS record"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}

variable "enable_secrets_manager" {
  description = "Use AWS Secrets Manager for secrets"
  type        = bool
  default     = false
}

variable "enable_s3_audit_logs" {
  description = "Enable S3 bucket for audit logs"
  type        = bool
  default     = false
}

variable "audit_logs_bucket" {
  description = "S3 bucket name for audit logs"
  type        = string
  default     = ""
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logs for audit trail"
  type        = bool
  default     = true
}

variable "audit_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 90
}

variable "enable_monitoring" {
  description = "Enable Prometheus metrics and OpenTelemetry tracing"
  type        = bool
  default     = true
}

variable "enable_audit" {
  description = "Enable audit logging"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "SonarQube-MCP"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}