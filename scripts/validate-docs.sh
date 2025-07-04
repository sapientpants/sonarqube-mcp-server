#!/bin/bash
# Documentation validation script for SonarQube MCP Server
# This script validates all documentation files for broken links and code snippets

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}📚 SonarQube MCP Server - Documentation Validation${NC}"
echo "==================================================="

# Configuration
DOCS_DIR="docs"
README_FILE="README.md"
TEMP_DIR="/tmp/doc-validation-$$"
ERRORS_FOUND=false

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"
if command_exists node; then
    echo -e "✅ Node.js is installed"
else
    echo -e "${YELLOW}⚠️  Node.js not installed. Some checks will be skipped.${NC}"
fi

# Function to validate internal links
validate_internal_links() {
    local file=$1
    local base_dir=$(dirname "$file")
    
    echo -e "\n${BLUE}🔗 Checking internal links in: $(basename $file)${NC}"
    
    # Extract markdown links [text](url)
    grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$file" | while IFS= read -r link; do
        url=$(echo "$link" | sed -E 's/\[[^\]]+\]\(([^)]+)\)/\1/')
        
        # Skip external links
        if [[ "$url" =~ ^https?:// ]]; then
            continue
        fi
        
        # Skip anchors
        if [[ "$url" =~ ^# ]]; then
            continue
        fi
        
        # Remove anchor from URL if present
        file_path=$(echo "$url" | cut -d'#' -f1)
        
        # Resolve relative path
        if [[ "$file_path" =~ ^/ ]]; then
            # Absolute path from project root
            full_path="${file_path#/}"
        else
            # Relative path
            full_path="$base_dir/$file_path"
        fi
        
        # Normalize path
        full_path=$(cd "$(dirname "$full_path")" 2>/dev/null && pwd)/$(basename "$full_path") 2>/dev/null || echo "$full_path")
        
        # Check if file exists
        if [ ! -f "$full_path" ]; then
            echo -e "  ${RED}✗ Broken link: $url${NC}"
            echo "    Expected file: $full_path"
            ERRORS_FOUND=true
        else
            echo -e "  ${GREEN}✓ Valid link: $url${NC}"
        fi
    done
}

# Function to validate code blocks
validate_code_blocks() {
    local file=$1
    
    echo -e "\n${BLUE}💻 Checking code blocks in: $(basename $file)${NC}"
    
    # Extract code blocks with language
    awk '/^```[a-zA-Z]+/{lang=$1; gsub(/```/, "", lang); getline; code=""; 
         while ($0 !~ /^```/) {code=code"\n"$0; getline} 
         print lang"|"code}' "$file" > "$TEMP_DIR/code_blocks.txt"
    
    while IFS='|' read -r lang code; do
        if [ -z "$lang" ]; then
            continue
        fi
        
        case "$lang" in
            bash|sh)
                # Validate bash syntax
                if echo "$code" | bash -n 2>/dev/null; then
                    echo -e "  ${GREEN}✓ Valid bash code block${NC}"
                else
                    echo -e "  ${RED}✗ Invalid bash syntax${NC}"
                    ERRORS_FOUND=true
                fi
                ;;
            yaml|yml)
                # Check YAML syntax if yamllint is available
                if command_exists yamllint; then
                    if echo "$code" | yamllint - >/dev/null 2>&1; then
                        echo -e "  ${GREEN}✓ Valid YAML code block${NC}"
                    else
                        echo -e "  ${YELLOW}⚠️  YAML syntax issues${NC}"
                    fi
                else
                    echo -e "  ${BLUE}ℹ️  Skipping YAML validation (yamllint not installed)${NC}"
                fi
                ;;
            json)
                # Validate JSON syntax
                if echo "$code" | jq . >/dev/null 2>&1; then
                    echo -e "  ${GREEN}✓ Valid JSON code block${NC}"
                else
                    echo -e "  ${RED}✗ Invalid JSON syntax${NC}"
                    ERRORS_FOUND=true
                fi
                ;;
            typescript|javascript|ts|js)
                echo -e "  ${BLUE}ℹ️  TypeScript/JavaScript code block found${NC}"
                ;;
            *)
                echo -e "  ${BLUE}ℹ️  $lang code block found${NC}"
                ;;
        esac
    done < "$TEMP_DIR/code_blocks.txt"
}

# Function to check for required sections
check_required_sections() {
    local file=$1
    local required_sections=("## Overview" "## Prerequisites" "## Installation" "## Usage")
    
    echo -e "\n${BLUE}📑 Checking required sections in: $(basename $file)${NC}"
    
    for section in "${required_sections[@]}"; do
        if grep -q "^$section" "$file"; then
            echo -e "  ${GREEN}✓ Found section: $section${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Missing section: $section${NC}"
        fi
    done
}

# Function to validate external links (basic check)
validate_external_links() {
    local file=$1
    
    echo -e "\n${BLUE}🌐 Checking external links in: $(basename $file)${NC}"
    
    # Extract external links
    grep -oE 'https?://[^ )]+' "$file" | sort -u | while read -r url; do
        # Remove trailing punctuation
        url=$(echo "$url" | sed 's/[.,;:]$//')
        
        # Basic URL format check
        if [[ "$url" =~ ^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,} ]]; then
            echo -e "  ${GREEN}✓ Valid URL format: $url${NC}"
        else
            echo -e "  ${RED}✗ Invalid URL format: $url${NC}"
            ERRORS_FOUND=true
        fi
    done
}

# Function to check Mermaid diagrams
check_mermaid_diagrams() {
    local file=$1
    
    if grep -q '```mermaid' "$file"; then
        echo -e "\n${BLUE}📊 Checking Mermaid diagrams in: $(basename $file)${NC}"
        
        # Count opening and closing tags
        open_count=$(grep -c '```mermaid' "$file")
        close_count=$(awk '/```mermaid/{count++} /```/{if(prev=="mermaid") count--} {prev=$0} END{print count}' "$file")
        
        if [ "$open_count" -eq "$close_count" ]; then
            echo -e "  ${GREEN}✓ Mermaid diagrams properly closed${NC}"
        else
            echo -e "  ${RED}✗ Unclosed Mermaid diagram blocks${NC}"
            ERRORS_FOUND=true
        fi
    fi
}

# Main validation
echo -e "\n${YELLOW}🔍 Starting documentation validation...${NC}"

# Validate all markdown files
all_files=()

# Add README if exists
if [ -f "$README_FILE" ]; then
    all_files+=("$README_FILE")
fi

# Add all docs files
if [ -d "$DOCS_DIR" ]; then
    while IFS= read -r -d '' file; do
        all_files+=("$file")
    done < <(find "$DOCS_DIR" -name "*.md" -print0)
fi

# Process each file
for file in "${all_files[@]}"; do
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📄 Validating: $file${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    validate_internal_links "$file"
    validate_code_blocks "$file"
    validate_external_links "$file"
    check_mermaid_diagrams "$file"
    
    # Check required sections for main docs
    if [[ "$file" =~ (deployment|architecture|api-reference)\.md$ ]]; then
        check_required_sections "$file"
    fi
done

# Additional checks
echo -e "\n${YELLOW}📊 Running additional checks...${NC}"

# Check for orphaned images
if [ -d "$DOCS_DIR/images" ] || [ -d "images" ]; then
    echo -e "\n${BLUE}🖼️  Checking for orphaned images...${NC}"
    
    for img_dir in "$DOCS_DIR/images" "images"; do
        if [ -d "$img_dir" ]; then
            find "$img_dir" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.svg" \) | while read -r img; do
                img_name=$(basename "$img")
                if ! grep -r "$img_name" "$DOCS_DIR" "$README_FILE" 2>/dev/null | grep -v Binary >/dev/null; then
                    echo -e "  ${YELLOW}⚠️  Potentially orphaned image: $img${NC}"
                fi
            done
        fi
    done
fi

# Check for TODOs in documentation
echo -e "\n${BLUE}📝 Checking for TODOs...${NC}"
todo_count=$(grep -r "TODO\|FIXME\|XXX" "${all_files[@]}" 2>/dev/null | wc -l || echo 0)
if [ "$todo_count" -gt 0 ]; then
    echo -e "  ${YELLOW}⚠️  Found $todo_count TODO/FIXME/XXX markers${NC}"
    grep -n "TODO\|FIXME\|XXX" "${all_files[@]}" 2>/dev/null | head -5
else
    echo -e "  ${GREEN}✓ No TODOs found${NC}"
fi

# Check documentation structure
echo -e "\n${BLUE}📁 Checking documentation structure...${NC}"
expected_docs=(
    "docs/api-reference.md"
    "docs/architecture.md"
    "docs/deployment.md"
    "docs/security.md"
    "docs/troubleshooting.md"
)

for doc in "${expected_docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "  ${GREEN}✓ Found: $doc${NC}"
    else
        echo -e "  ${RED}✗ Missing: $doc${NC}"
        ERRORS_FOUND=true
    fi
done

# Cleanup
rm -rf "$TEMP_DIR"

# Final summary
echo -e "\n==================================================="
if [ "$ERRORS_FOUND" = false ]; then
    echo -e "${GREEN}✅ Documentation validation passed!${NC}"
    echo -e "\n${YELLOW}Documentation is well-structured with:${NC}"
    echo "  - Valid internal links"
    echo "  - Syntactically correct code examples"
    echo "  - Proper formatting"
    echo "  - Complete structure"
else
    echo -e "${RED}❌ Documentation validation found issues${NC}"
    echo -e "${YELLOW}Please fix the errors above${NC}"
    exit 1
fi