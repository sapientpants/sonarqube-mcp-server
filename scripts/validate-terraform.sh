#!/bin/bash
# Terraform validation script for SonarQube MCP Server
# This script validates all Terraform modules and configurations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 SonarQube MCP Server - Terraform Validation${NC}"
echo "=================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"
if command_exists terraform; then
    echo -e "✅ Terraform is installed: $(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -1)"
else
    echo -e "${RED}❌ Terraform is not installed. Please install it first.${NC}"
    echo "   Visit: https://www.terraform.io/downloads"
    exit 1
fi

# Function to validate a Terraform module
validate_module() {
    local module_path=$1
    local module_name=$(basename "$module_path")
    
    echo -e "\n${BLUE}🔍 Validating module: $module_name${NC}"
    echo "Path: $module_path"
    
    if [ ! -d "$module_path" ]; then
        echo -e "${YELLOW}⚠️  Module directory does not exist, skipping${NC}"
        return 0
    fi
    
    cd "$module_path"
    
    # Check if any .tf files exist
    if ! ls *.tf >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  No Terraform files found in $module_name, skipping${NC}"
        cd - >/dev/null
        return 0
    fi
    
    # Initialize Terraform
    echo -n "  Initializing... "
    if terraform init -backend=false -upgrade >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}  Failed to initialize Terraform${NC}"
        cd - >/dev/null
        return 1
    fi
    
    # Validate configuration
    echo -n "  Validating syntax... "
    if terraform validate >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        terraform validate
        cd - >/dev/null
        return 1
    fi
    
    # Format check
    echo -n "  Checking formatting... "
    if terraform fmt -check -recursive >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠️  Formatting issues found${NC}"
        echo "    Run 'terraform fmt -recursive' to fix"
        terraform fmt -check -diff
    fi
    
    # Check for required variables
    echo -n "  Checking variables... "
    required_vars=$(terraform-config-inspect . 2>/dev/null | grep "Required" | wc -l || echo "0")
    if [ "$required_vars" -gt 0 ]; then
        echo -e "${BLUE}$required_vars required variables${NC}"
        terraform-config-inspect . 2>/dev/null | grep -A1 "Required" || true
    else
        echo -e "${GREEN}✓ No required variables without defaults${NC}"
    fi
    
    # Security checks
    echo "  Running security checks..."
    
    # Check for hardcoded credentials
    echo -n "    Checking for hardcoded secrets... "
    if grep -r -i -E "(password|secret|key|token)\s*=\s*\"[^$\{]" *.tf 2>/dev/null | grep -v "variable\|output\|description"; then
        echo -e "${RED}✗ Found potential hardcoded secrets${NC}"
    else
        echo -e "${GREEN}✓${NC}"
    fi
    
    # Check for public access
    echo -n "    Checking for overly permissive access... "
    if grep -r "0.0.0.0/0" *.tf 2>/dev/null | grep -v "#"; then
        echo -e "${YELLOW}⚠️  Found references to 0.0.0.0/0${NC}"
    else
        echo -e "${GREEN}✓${NC}"
    fi
    
    # Generate documentation check
    echo -n "  Checking documentation... "
    if [ -f "README.md" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠️  No README.md found${NC}"
    fi
    
    cd - >/dev/null
    return 0
}

# Function to test terraform plan with example values
test_terraform_plan() {
    local module_path=$1
    local module_name=$(basename "$module_path")
    
    echo -e "\n${BLUE}🧪 Testing terraform plan for: $module_name${NC}"
    
    if [ ! -f "$module_path/terraform.tfvars.example" ]; then
        echo -e "${YELLOW}  No terraform.tfvars.example found, skipping plan test${NC}"
        return 0
    fi
    
    cd "$module_path"
    
    # Copy example vars
    cp terraform.tfvars.example terraform.tfvars
    
    # Try to create a plan
    echo -n "  Creating plan... "
    if terraform plan -out=tfplan >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        
        # Show resource summary
        echo "  Resources to be created:"
        terraform show -json tfplan 2>/dev/null | jq -r '.planned_values.root_module | 
            if .resources then 
                .resources | group_by(.type) | map({
                    type: .[0].type, 
                    count: length
                }) | .[] | "    - \(.count) \(.type)"
            else 
                "    No resources" 
            end' 2>/dev/null || echo "    Unable to parse plan"
    else
        echo -e "${YELLOW}⚠️  Plan failed (this is expected without real AWS credentials)${NC}"
    fi
    
    # Cleanup
    rm -f terraform.tfvars tfplan
    cd - >/dev/null
}

# Main validation
echo -e "\n${YELLOW}🔧 Starting Terraform validation...${NC}"

# Base terraform directory
TERRAFORM_DIR="terraform"

if [ ! -d "$TERRAFORM_DIR" ]; then
    echo -e "${RED}❌ Terraform directory not found at: $TERRAFORM_DIR${NC}"
    exit 1
fi

# Track results
all_passed=true
modules_validated=0

# Validate each provider module
for provider in aws azure gcp; do
    module_path="$TERRAFORM_DIR/$provider"
    if validate_module "$module_path"; then
        ((modules_validated++))
    else
        all_passed=false
    fi
done

# Check for base modules
if [ -d "$TERRAFORM_DIR/modules" ]; then
    for module in "$TERRAFORM_DIR/modules"/*; do
        if [ -d "$module" ]; then
            if validate_module "$module"; then
                ((modules_validated++))
            else
                all_passed=false
            fi
        fi
    done
fi

# Additional checks
echo -e "\n${YELLOW}📊 Additional validation...${NC}"

# Check for consistent versioning
echo -n "Checking Terraform version constraints... "
version_files=$(find "$TERRAFORM_DIR" -name "versions.tf" -o -name "terraform.tf" 2>/dev/null)
if [ -n "$version_files" ]; then
    versions=$(echo "$version_files" | xargs grep -h "required_version" 2>/dev/null | sort -u | wc -l)
    if [ "$versions" -eq 1 ]; then
        echo -e "${GREEN}✓ Consistent${NC}"
    else
        echo -e "${YELLOW}⚠️  Inconsistent version constraints found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No version files found${NC}"
fi

# Test terraform plan for AWS module (if it has example vars)
if [ -f "$TERRAFORM_DIR/aws/terraform.tfvars.example" ]; then
    test_terraform_plan "$TERRAFORM_DIR/aws"
fi

# Final summary
echo -e "\n=================================================="
if [ "$all_passed" = true ] && [ "$modules_validated" -gt 0 ]; then
    echo -e "${GREEN}✅ All Terraform modules validated successfully!${NC}"
    echo "   Modules validated: $modules_validated"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Update terraform.tfvars.example with your values"
    echo "2. Run 'terraform init' in the desired module"
    echo "3. Run 'terraform plan' to see what will be created"
    echo "4. Run 'terraform apply' to create resources"
else
    echo -e "${RED}❌ Terraform validation completed with issues${NC}"
    echo "   Modules validated: $modules_validated"
    echo -e "\n${YELLOW}Please fix the issues above before proceeding${NC}"
    exit 1
fi