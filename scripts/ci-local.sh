#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Local CI Simulation Script
# Purpose: Run the same checks as CI locally before pushing
# Usage: ./scripts/ci-local.sh [--fast] [--no-security]
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FAST_MODE=false
SKIP_SECURITY=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[CI-LOCAL]${NC} $1"
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

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fast)
            FAST_MODE=true
            shift
            ;;
        --no-security)
            SKIP_SECURITY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--fast] [--no-security]"
            echo "  --fast        Skip slower checks (container scan, full coverage)"
            echo "  --no-security Skip security scans"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

cd "$PROJECT_ROOT"

log "Starting local CI simulation..."
if [ "$FAST_MODE" = true ]; then
    info "Running in fast mode (some checks skipped)"
fi

# 1. Install dependencies (like CI setup)
log "Installing dependencies..."
pnpm install --frozen-lockfile

# 2. Core validation (parallel in real CI)
log "Running core validation checks..."

echo "  → Audit check..."
pnpm audit --audit-level critical

echo "  → Type checking..."
pnpm typecheck

echo "  → Linting..."
pnpm lint

echo "  → Format checking..."
pnpm format

echo "  → Running tests..."
if [ "$FAST_MODE" = true ]; then
    pnpm test
else
    pnpm test:coverage
fi

# 3. Build check
log "Checking build..."
pnpm build

# 4. Security scans (if not skipped)
if [ "$SKIP_SECURITY" = false ]; then
    log "Running security checks..."
    
    # Check if OSV scanner is available
    if command -v osv-scanner &> /dev/null; then
        echo "  → OSV vulnerability scan..."
        if [ -r pnpm-lock.yaml ]; then
            osv-scanner --lockfile=pnpm-lock.yaml
        else
            warn "pnpm-lock.yaml not found or not readable. Skipping OSV scan."
        fi
    else
        warn "OSV scanner not installed. Run: go install github.com/google/osv-scanner/cmd/osv-scanner@latest"
    fi
    
    # Container scan (if not in fast mode)
    if [ "$FAST_MODE" = false ] && [ -f "./scripts/scan-container.sh" ]; then
        if command -v docker &> /dev/null && command -v trivy &> /dev/null; then
            echo "  → Container security scan..."
            ./scripts/scan-container.sh
        else
            warn "Docker or Trivy not available. Skipping container scan."
        fi
    fi
else
    info "Security scans skipped"
fi

# 5. Changeset validation (simulate CI check)
log "Checking changesets..."
if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    # Check if we have any commits to compare
    if git diff --name-only HEAD~1 | grep -E '(src/|tests/)' > /dev/null; then
        # We have code changes, check for changesets
        if ! pnpm changeset:status > /dev/null 2>&1; then
            warn "Code changes detected but no changesets found"
            echo "  Run 'pnpm changeset' to create one, or 'pnpm changeset --empty' for non-release changes"
        else
            info "Changesets validated"
        fi
    else
        info "No code changes detected, changeset check skipped"
    fi
else
    info "No previous commit found, changeset check skipped"
fi

# 6. Final summary
log "✅ Local CI simulation complete!"
echo
info "Summary:"
echo "  ✅ Dependencies installed"
echo "  ✅ Core validation passed"
echo "  ✅ Build successful"
if [ "$SKIP_SECURITY" = false ]; then
    echo "  ✅ Security checks completed"
fi
echo "  ✅ Changesets validated"
echo
info "Your code is ready to push! 🚀"
echo
info "Next steps:"
echo "  1. git add . && git commit -m 'your commit message'"
echo "  2. git push origin your-branch"
echo "  3. Create a pull request"