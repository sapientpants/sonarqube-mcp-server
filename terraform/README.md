# Terraform Modules for SonarQube MCP Server

This directory contains Terraform modules for deploying the SonarQube MCP Server on various cloud platforms.

## Available Modules

- **AWS**: Deploy on Amazon EKS with ALB ingress and IAM integration
- **Azure**: Deploy on Azure AKS with Application Gateway and Azure AD integration  
- **GCP**: Deploy on Google GKE with Cloud Load Balancing and Workload Identity

## Prerequisites

- Terraform >= 1.0
- Cloud provider CLI configured (AWS CLI, Azure CLI, or gcloud)
- Kubernetes cluster already provisioned
- Helm 3.x installed

## Quick Start

### AWS Deployment

```bash
cd terraform/aws

# Initialize Terraform
terraform init

# Create terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Plan deployment
terraform plan

# Apply deployment
terraform apply
```

### Azure Deployment

```bash
cd terraform/azure

# Initialize Terraform
terraform init

# Create terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Plan deployment
terraform plan

# Apply deployment
terraform apply
```

### GCP Deployment

```bash
cd terraform/gcp

# Initialize Terraform  
terraform init

# Create terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Plan deployment
terraform plan

# Apply deployment
terraform apply
```

## Module Structure

Each cloud provider module includes:

- `main.tf` - Main Terraform configuration
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `versions.tf` - Provider version constraints
- `terraform.tfvars.example` - Example variable values

## State Management

For production deployments, use remote state backends:

### AWS S3 Backend

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "sonarqube-mcp/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Azure Storage Backend

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate"
    container_name      = "tfstate"
    key                 = "sonarqube-mcp.terraform.tfstate"
  }
}
```

### GCS Backend

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "sonarqube-mcp"
  }
}
```

## Security Considerations

1. **Secrets Management**: Never commit sensitive values to version control
2. **IAM Permissions**: Use least privilege principles
3. **Network Security**: Configure network policies and security groups
4. **Encryption**: Enable encryption at rest and in transit

## Support

For issues or questions, please open an issue on GitHub.