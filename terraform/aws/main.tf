terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# Data sources
data "aws_eks_cluster" "cluster" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.eks_cluster_name
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Configure providers
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# Create namespace
resource "kubernetes_namespace" "sonarqube_mcp" {
  metadata {
    name = var.namespace
    labels = {
      name = var.namespace
    }
  }
}

# Create IAM role for service account
resource "aws_iam_role" "sonarqube_mcp" {
  name = "${var.cluster_name}-sonarqube-mcp"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:${var.namespace}:${var.service_account_name}"
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Attach policies to IAM role
resource "aws_iam_role_policy_attachment" "sonarqube_mcp_secrets" {
  count      = var.enable_secrets_manager ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
  role       = aws_iam_role.sonarqube_mcp.name
}

# Create custom policy for S3 audit logs
resource "aws_iam_policy" "audit_logs" {
  count = var.enable_s3_audit_logs ? 1 : 0
  name  = "${var.cluster_name}-sonarqube-mcp-audit-logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.audit_logs_bucket}",
          "arn:aws:s3:::${var.audit_logs_bucket}/*"
        ]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "sonarqube_mcp_audit_logs" {
  count      = var.enable_s3_audit_logs ? 1 : 0
  policy_arn = aws_iam_policy.audit_logs[0].arn
  role       = aws_iam_role.sonarqube_mcp.name
}

# Create service account
resource "kubernetes_service_account" "sonarqube_mcp" {
  metadata {
    name      = var.service_account_name
    namespace = kubernetes_namespace.sonarqube_mcp.metadata[0].name
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.sonarqube_mcp.arn
    }
  }
}

# Create secrets from AWS Secrets Manager
resource "kubernetes_secret" "sonarqube_token" {
  count = var.enable_secrets_manager ? 0 : 1

  metadata {
    name      = "sonarqube-mcp-token"
    namespace = kubernetes_namespace.sonarqube_mcp.metadata[0].name
  }

  data = {
    SONARQUBE_TOKEN = var.sonarqube_token
  }

  type = "Opaque"
}

# Deploy Helm chart
resource "helm_release" "sonarqube_mcp" {
  name       = "sonarqube-mcp"
  namespace  = kubernetes_namespace.sonarqube_mcp.metadata[0].name
  repository = var.helm_repository
  chart      = var.helm_chart
  version    = var.helm_chart_version

  values = [
    templatefile("${path.module}/values.yaml.tpl", {
      service_account_name = kubernetes_service_account.sonarqube_mcp.metadata[0].name
      sonarqube_base_url  = var.sonarqube_base_url
      ingress_host        = var.ingress_host
      oauth_issuer        = var.oauth_issuer
      oauth_audience      = var.oauth_audience
      enable_monitoring   = var.enable_monitoring
      enable_audit        = var.enable_audit
      tags                = var.tags
    })
  ]

  dynamic "set" {
    for_each = var.helm_values
    content {
      name  = set.key
      value = set.value
    }
  }

  depends_on = [
    kubernetes_service_account.sonarqube_mcp
  ]
}

# Create ALB ingress
resource "kubernetes_ingress_v1" "sonarqube_mcp" {
  count = var.enable_alb_ingress ? 1 : 0

  metadata {
    name      = "sonarqube-mcp"
    namespace = kubernetes_namespace.sonarqube_mcp.metadata[0].name
    annotations = {
      "kubernetes.io/ingress.class"                    = "alb"
      "alb.ingress.kubernetes.io/scheme"              = var.alb_scheme
      "alb.ingress.kubernetes.io/target-type"         = "ip"
      "alb.ingress.kubernetes.io/certificate-arn"     = var.alb_certificate_arn
      "alb.ingress.kubernetes.io/listen-ports"        = jsonencode([{"HTTPS": 443}])
      "alb.ingress.kubernetes.io/ssl-redirect"        = "443"
      "alb.ingress.kubernetes.io/healthcheck-path"    = "/health"
      "alb.ingress.kubernetes.io/success-codes"       = "200"
      "alb.ingress.kubernetes.io/group.name"          = var.alb_group_name
      "alb.ingress.kubernetes.io/tags"                = join(",", [for k, v in var.tags : "${k}=${v}"])
    }
  }

  spec {
    rule {
      host = var.ingress_host
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "sonarqube-mcp"
              port {
                number = 3000
              }
            }
          }
        }
      }
    }
  }

  depends_on = [
    helm_release.sonarqube_mcp
  ]
}

# Create Route53 record
resource "aws_route53_record" "sonarqube_mcp" {
  count = var.enable_route53 ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.ingress_host
  type    = "A"

  alias {
    name                   = kubernetes_ingress_v1.sonarqube_mcp[0].status[0].load_balancer[0].ingress[0].hostname
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Create CloudWatch log group for audit logs
resource "aws_cloudwatch_log_group" "audit_logs" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/eks/${var.eks_cluster_name}/sonarqube-mcp"
  retention_in_days = var.audit_log_retention_days

  tags = var.tags
}