#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Project Setup Script
# Purpose: One-command setup for new developers
# Usage: ./scripts/setup.sh [project-name]
# =============================================================================

PROJECT_NAME="${1:-}"
CURRENT_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    error "Run this script from the project root directory"
fi

log "Starting project setup..."

# 1. Check prerequisites
log "Checking prerequisites..."

if ! command -v pnpm &> /dev/null; then
    if command -v mise &> /dev/null; then
        log "Installing pnpm via mise..."
        mise install pnpm@10.15.0
    else
        error "pnpm not found. Please install pnpm 10.15.0 or install mise first."
    fi
fi

if ! command -v node &> /dev/null; then
    if command -v mise &> /dev/null; then
        log "Installing Node.js via mise..."
        mise install node@22
    else
        error "Node.js not found. Please install Node.js 22+ or install mise first."
    fi
fi

# 2. Install dependencies
log "Installing dependencies..."
pnpm install

# 3. Rename project if name provided
if [[ -n "$PROJECT_NAME" ]]; then
    log "Renaming project to '$PROJECT_NAME'..."
    
    # Update package.json
    pnpm pkg set name="$PROJECT_NAME"
    
    # Update README.md title
    sed -i.bak "s/# Agentic Node + TypeScript Starter/# $PROJECT_NAME/" README.md && rm README.md.bak
    
    info "Project renamed to '$PROJECT_NAME'. Update other references manually as needed."
fi

# 4. Initialize git hooks
log "Setting up git hooks..."
pnpm prepare

# 5. Run initial verification
log "Running initial verification..."
if pnpm verify; then
    log "✅ All checks passed!"
else
    warn "Some checks failed. Fix issues before committing."
fi

# 6. Create initial build
log "Creating initial build..."
pnpm build

# 7. Show next steps
echo
log "🎉 Setup complete!"
echo
info "Next steps:"
echo "1. Open the project in your IDE (VS Code recommended)"
echo "2. Review and customize package.json, README.md, and other files"
echo "3. Start developing with: pnpm test:watch"
echo "4. Create your first feature with: pnpm changeset"
echo
info "Available commands:"
echo "  pnpm dev           # Start development mode"
echo "  pnpm test:watch    # Run tests in watch mode"
echo "  pnpm verify        # Run all quality checks"
echo "  pnpm changeset     # Create a changeset for your changes"
echo
info "Documentation:"
echo "  docs/GETTING_STARTED.md - Full setup guide"
echo "  docs/PROCESS.md         - Development workflow"
echo "  CLAUDE.md              - AI development tips"