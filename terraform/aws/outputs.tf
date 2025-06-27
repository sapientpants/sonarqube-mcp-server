output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.sonarqube_mcp.metadata[0].name
}

output "service_account_iam_role_arn" {
  description = "IAM role ARN for the service account"
  value       = aws_iam_role.sonarqube_mcp.arn
}

output "helm_release_name" {
  description = "Name of the Helm release"
  value       = helm_release.sonarqube_mcp.name
}

output "helm_release_status" {
  description = "Status of the Helm release"
  value       = helm_release.sonarqube_mcp.status
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = var.enable_alb_ingress ? kubernetes_ingress_v1.sonarqube_mcp[0].status[0].load_balancer[0].ingress[0].hostname : ""
}

output "application_url" {
  description = "URL to access the application"
  value       = "https://${var.ingress_host}"
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.audit_logs[0].name : ""
}