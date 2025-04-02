# SonarQube MCP Server Cleanup Plan

This document outlines a step-by-step plan to remove redundant and unused code from the SonarQube MCP Server codebase. Each task is designed to be independent and safe to implement without breaking core functionality.

## 1. ✅ Remove the utilities module

The `src/mcp/utilities.rs` file contains multiple unused functions, all marked with `#[allow(dead_code)]`.

**Steps:**
1. ✅ Remove all imports/uses of functions from `utilities.rs` in other files
2. ✅ Remove the `pub mod utilities;` line from `src/mcp/mod.rs`
3. ✅ Delete the `src/mcp/utilities.rs` file

**Files affected:**
- ✅ `src/mcp/mod.rs`
- ✅ `src/mcp/utilities.rs`
- ✅ `tests/utilities_tests.rs` (removed as it only tested the utilities module)

## 2. ✅ Consolidate duplicate Args struct

The `Args` struct is defined redundantly in both `src/main.rs` and `src/server/mod.rs`.

**Steps:**
1. ✅ Keep only the definition in `src/server/mod.rs`
2. ✅ In `src/main.rs`, add `use crate::server::Args;` to import it
3. ✅ Remove the duplicate definition from `src/main.rs`

**Files affected:**
- ✅ `src/main.rs`
- ✅ `src/server/mod.rs`

## 3. ✅ Clean up unused SonarQubeClient helper methods

Several helper methods in `SonarQubeClient` are marked with `#[allow(dead_code)]` and have been superseded by `QueryBuilder`.

**Steps:**
1. ✅ Remove the following methods from `SonarQubeClient`:
   - ✅ `append_param()`
   - ✅ `append_bool_param()`
   - ✅ `append_numeric_param()`
   - ✅ `append_array_param()`
2. ✅ Remove any tests that might be dependent on these methods

**Files affected:**
- ✅ `src/mcp/sonarqube/client.rs`

## 4. ✅ Fix or properly implement prompts functionality

The `prompts.json` file is empty, and the `prompts_get()` function doesn't use its input.

- ✅ Replace the JSON loading with a static empty Vec
- ✅ Add a comment explaining that prompts are not currently implemented

**Files affected:**
- ✅ `src/mcp/templates/prompts.json` (removed as it's no longer needed)
- ✅ `src/mcp/prompts.rs`

## 5. ✅ Clean up constants with inappropriate attributes

Remove incorrect `#[allow(dead_code)]` attributes from constants that are actually used in the codebase.

**Steps:**
1. ✅ Verify which constants are used elsewhere in the codebase
2. ✅ Remove the `#[allow(dead_code)]` attribute from the following constants:
   - ✅ `JSONRPC_VERSION`
   - ✅ `PROTOCOL_VERSION`
   - ✅ `SERVER_NAME`
   - ✅ `SERVER_VERSION`

**Files affected:**
- ✅ `src/mcp/mod.rs`

## 6. ✅ Implement proper resource handling

The `resource_read()` function ignores its input and returns a hardcoded message.

- ✅ Remove `resource_read()`

**Files affected:**
- ✅ `src/mcp/resources.rs`
- ✅ `src/server/mod.rs`
- ✅ `tests/resources_tests.rs`

## 7. Clean up test_utils.rs if not used in tests

Examine if `src/mcp/sonarqube/test_utils.rs` is actually used in any tests.

**Steps:**
1. Check if any test files import from test_utils
2. If not used, remove the file and its module declaration
3. If used, ensure it only contains what's needed for tests

**Files affected:**
- `src/mcp/sonarqube/test_utils.rs`
- `src/mcp/sonarqube/mod.rs`

## Implementation Order

For the safest implementation, we recommend following this order:

1. ✅ Clean up utilities module (#1) - standalone module
2. ✅ Clean up constants with inappropriate attributes (#5) - lowest risk
3. ✅ Remove unused utility methods (#3) - isolated to client implementation  
4. ✅ Consolidate Args struct (#2) - simple refactoring
5. ✅ Address prompts functionality (#4) - contained feature
6. Implement proper resource handling (#6) - contained feature
7. Clean up test utilities (#7) - only impacts tests

## Testing Strategy

After each step:
1. Compile the code to verify there are no build errors
2. Run the test suite to ensure no tests are broken
3. Start the server and verify basic functionality still works correctly

Remember to commit changes after each step is completed and tested. 