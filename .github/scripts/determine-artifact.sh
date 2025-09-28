#!/bin/bash
# =============================================================================
# SCRIPT: Determine Build Artifact from GitHub Releases
# PURPOSE: Find and validate the correct artifact from a GitHub release
# USAGE: ./determine-artifact.sh --tag <tag> --repo <repo> --version <version> --prefix <prefix> --output <output_file>
# =============================================================================

set -euo pipefail

# Default values
TAG_NAME=""
REPO=""
VERSION=""
PREFIX=""
OUTPUT_FILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      TAG_NAME="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --prefix)
      PREFIX="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$TAG_NAME" ] || [ -z "$REPO" ] || [ -z "$VERSION" ] || [ -z "$PREFIX" ] || [ -z "$OUTPUT_FILE" ]; then
  echo "❌ Missing required parameters"
  echo "Usage: $0 --tag <tag> --repo <repo> --version <version> --prefix <prefix> --output <output_file>"
  exit 1
fi

echo "🔍 Determining artifact source for $PREFIX-$VERSION from release $TAG_NAME"

# Fetch tag information from GitHub API
TAG_API_URL="https://api.github.com/repos/$REPO/git/refs/tags/$TAG_NAME"
TAG_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -w "\n%{http_code}" $TAG_API_URL)
TAG_BODY=$(echo "$TAG_RESPONSE" | head -n -1)
TAG_STATUS=$(echo "$TAG_RESPONSE" | tail -n 1)

if [ "$TAG_STATUS" != "200" ]; then
  echo "❌ GitHub API request failed for $TAG_API_URL with status $TAG_STATUS"
  echo "Response: $TAG_BODY"
  exit 1
fi

# Extract the object SHA and type
TAG_OBJECT_SHA=$(echo "$TAG_BODY" | jq -r '.object.sha')
TAG_OBJECT_TYPE=$(echo "$TAG_BODY" | jq -r '.object.type')

echo "📌 Tag $TAG_NAME points to $TAG_OBJECT_TYPE: $TAG_OBJECT_SHA"

# Determine the commit SHA based on tag type
if [ "$TAG_OBJECT_TYPE" = "tag" ]; then
  # Annotated tag - fetch the tag object to get the commit SHA
  TAG_OBJECT_URL="https://api.github.com/repos/$REPO/git/tags/$TAG_OBJECT_SHA"
  TAG_OBJECT_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -w "\n%{http_code}" $TAG_OBJECT_URL)
  TAG_OBJECT_BODY=$(echo "$TAG_OBJECT_RESPONSE" | head -n -1)
  TAG_OBJECT_STATUS=$(echo "$TAG_OBJECT_RESPONSE" | tail -n 1)

  if [ "$TAG_OBJECT_STATUS" != "200" ]; then
    echo "❌ Failed to fetch annotated tag object with status $TAG_OBJECT_STATUS"
    echo "Response: $TAG_OBJECT_BODY"
    exit 1
  fi

  COMMIT_SHA=$(echo "$TAG_OBJECT_BODY" | jq -r '.object.sha')
  echo "📌 Annotated tag references commit: $COMMIT_SHA"
elif [ "$TAG_OBJECT_TYPE" = "commit" ]; then
  # Lightweight tag - directly references a commit
  COMMIT_SHA=$TAG_OBJECT_SHA
  echo "📌 Lightweight tag directly references commit: $COMMIT_SHA"
else
  echo "❌ Unexpected tag object type: $TAG_OBJECT_TYPE"
  exit 1
fi

# Find the workflow run that created the release
RUNS_API_URL="https://api.github.com/repos/$REPO/actions/runs?head_sha=$COMMIT_SHA&status=success&event=push"
echo "🔍 Searching for successful workflow runs for commit $COMMIT_SHA"

RUNS_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -w "\n%{http_code}" $RUNS_API_URL)
RUNS_BODY=$(echo "$RUNS_RESPONSE" | head -n -1)
RUNS_STATUS=$(echo "$RUNS_RESPONSE" | tail -n 1)

if [ "$RUNS_STATUS" != "200" ]; then
  echo "❌ Failed to fetch workflow runs with status $RUNS_STATUS"
  echo "Response: $RUNS_BODY"
  exit 1
fi

# Find the Main workflow run
MAIN_RUN=$(echo "$RUNS_BODY" | jq -r '.workflow_runs[] | select(.name == "Main") | {id: .id, created_at: .created_at}')

if [ -z "$MAIN_RUN" ]; then
  echo "❌ No successful Main workflow run found for commit $COMMIT_SHA"
  echo "Available runs:"
  echo "$RUNS_BODY" | jq -r '.workflow_runs[] | "\(.name): \(.id) (\(.status))"'
  exit 1
fi

RUN_ID=$(echo "$MAIN_RUN" | jq -r '.id')
echo "✅ Found Main workflow run: $RUN_ID"

# Get artifacts from the workflow run
ARTIFACTS_API_URL="https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts"
echo "🔍 Fetching artifacts from run $RUN_ID"

ARTIFACTS_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -w "\n%{http_code}" $ARTIFACTS_API_URL)
ARTIFACTS_BODY=$(echo "$ARTIFACTS_RESPONSE" | head -n -1)
ARTIFACTS_STATUS=$(echo "$ARTIFACTS_RESPONSE" | tail -n 1)

if [ "$ARTIFACTS_STATUS" != "200" ]; then
  echo "❌ Failed to fetch artifacts with status $ARTIFACTS_STATUS"
  echo "Response: $ARTIFACTS_BODY"
  exit 1
fi

# Find the artifact with the specified prefix
ARTIFACT_NAME="$PREFIX-$VERSION-${COMMIT_SHA:0:7}"
ARTIFACT=$(echo "$ARTIFACTS_BODY" | jq -r --arg name "$ARTIFACT_NAME" '.artifacts[] | select(.name == $name)')

if [ -z "$ARTIFACT" ]; then
  echo "❌ Artifact $ARTIFACT_NAME not found in workflow run $RUN_ID"
  echo "Available artifacts:"
  echo "$ARTIFACTS_BODY" | jq -r '.artifacts[].name'
  exit 1
fi

ARTIFACT_ID=$(echo "$ARTIFACT" | jq -r '.id')
ARTIFACT_SIZE=$(echo "$ARTIFACT" | jq -r '.size_in_bytes')

echo "✅ Found artifact: $ARTIFACT_NAME (ID: $ARTIFACT_ID, Size: $ARTIFACT_SIZE bytes)"

# Output the results for GitHub Actions
{
  echo "artifact_name=$ARTIFACT_NAME"
  echo "artifact_id=$ARTIFACT_ID"
  echo "run_id=$RUN_ID"
  echo "commit_sha=$COMMIT_SHA"
} >> "$OUTPUT_FILE"

echo "✅ Artifact information written to $OUTPUT_FILE"