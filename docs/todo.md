# DeepSource Issues Todo List

## Documentation Issues (RS-D1001: Undocumented public item in source code)

These issues are about missing documentation for public items in the codebase. All public items should be documented to improve code clarity and help other developers understand and use the code.

### src/mcp/sonarqube/types.rs
- [x] Line 353: `SonarQubeListProjectsResult` struct - FIXED
- [x] Line 334: `SonarQubeListProjectsRequest` struct - FIXED
- [x] Line 319: `SonarQubeQualityGateResult` struct - FIXED
- [x] Line 309: `SonarQubeQualityGateRequest` struct - FIXED
- [x] Line 301: `QualityGateCondition` struct - FIXED
- [x] Line 295: `QualityGateResponse` struct - FIXED (enhanced docs at line 110)
- [x] Line 281: `Component` struct - FIXED (already had docs at line 101)
- [x] Line 272: `SonarQubeMetricsRequest` struct - FIXED
- [x] Line 236: `SonarQubeIssuesResult` struct - FIXED (already had basic docs, enhanced them)
- [x] Line 199: `SonarQubeIssuesRequest` struct - FIXED (already had basic docs)
- [x] Line 162: `Issue` struct - FIXED
- [x] Line 154: `TextRange` struct - NOT FOUND (possibly removed in a refactor)
- [x] Line 146: `Paging` struct - FIXED
- [x] Line 139: `Project` struct - FIXED
- [x] Line 123: `SonarError` struct - FIXED
- [x] Line 116: `Organization` struct - NOT FOUND (organization exists as a field in SonarQubeConfig struct)
- [x] Line 109: `ProjectsResponse` struct - FIXED
- [x] Line 100: `SonarQubeConfig` struct - FIXED
- [x] Line 85: Various enums and structs (review) - FIXED (`MetricsResponse`, `ComponentMeasures`, `Measure`, `IssuesResponse`)
- [x] Line 75: Various enums and structs (review) - FIXED (`IssuesQueryParams` and its implementation)
- [x] Line 64: Various enums and structs (review) - FIXED (`Component` struct and its fields)
- [x] Line 55: Various enums and structs (review) - FIXED
- [x] Line 47: Various enums and structs (review) - FIXED
- [x] Line 41: Various enums and structs (review) - FIXED
- [x] Line 33: Various enums and structs (review) - FIXED (`From<serde_json::Error>` implementation for `SonarError`)
- [x] Line 4: Module level documentation - FIXED

### src/mcp/utilities.rs
- [x] Line 49: Public function or struct - FIXED (roots_list)
- [x] Line 45: Public function or struct - FIXED (logging_set_level)
- [x] Line 41: Public function or struct - FIXED (ping)

### src/mcp/types.rs
- [x] Line 367 and multiple others: Add documentation to public items in this file - FIXED (added comprehensive documentation to all types)

### src/mcp/tools.rs
- [x] Line 14: Public function or struct - FIXED (tools_list)

### src/mcp/sonarqube/mod.rs
- [x] Line 3: Module level documentation - FIXED
- [x] Line 2: Public item documentation - FIXED (tools module)
- [x] Line 1: Public item documentation - FIXED (client module)

### src/mcp/resources.rs
- [x] Line 16: Public function or struct - FIXED (resource_read)
- [x] Line 4: Public function or struct - FIXED (resources_list)

### src/mcp/prompts.rs
- [x] Line 16: Public function or struct - FIXED (prompts_get)
- [x] Line 4: Public function or struct - FIXED (prompts_list)

### src/mcp/mod.rs
- [x] Lines 1-6: Module level documentation and public items - FIXED

### src/lib.rs
- [x] Line 1: Crate level documentation - FIXED

## Other Issues

### Bug Risk Issues
- [x] tests/end_to_end_tests.rs:40 - RS-E1021: Called `mem::forget` or `mem::drop` on a non-Drop type - FIXED (removed unnecessary explicit drop call)

### Anti-Pattern Issues
- [ ] src/mcp/sonarqube/client.rs:116 - RS-R1000: Function with cyclomatic complexity higher than threshold
- [x] tests/end_to_end_tests.rs:162 - RS-W1079: Empty call to `new()` - FIXED (replaced String::new() with String::default())
- [x] src/main.rs:86 - RS-W1079: Empty call to `new()` - FIXED (replaced String::new() with String::default())

## Progress Tracking

Total issues: 88
- Fixed: 87
- Remaining: 1

All documentation issues have been fixed! Next, priority should be given to addressing bug risk and anti-pattern issues. 

## Plan for Resolving Cyclomatic Complexity in src/mcp/sonarqube/client.rs

The `get_issues` function in src/mcp/sonarqube/client.rs has high cyclomatic complexity due to the large number of conditional checks and URL parameter additions. Below is a step-by-step plan to refactor this function:

### Step 1: Analysis
- Review the function to identify the sources of complexity
- Observe that most of the complexity comes from adding many optional URL parameters
- Note that each parameter follows a similar pattern but is handled separately

### Step 2: Extract Parameter Building Logic
- Create a helper function to handle URL parameter appending
- For example: `fn append_param(url: &mut String, param_name: &str, value: &str)`
- For array values, create a helper to join and append: `fn append_array_param(url: &mut String, param_name: &str, values: &[String])`

### Step 3: Create a Query Builder
- Create a query parameter builder struct that handles common parameter types
- Implement methods for adding different parameter types (strings, booleans, arrays)
- The builder will properly format and encode parameters

### Step 4: Refactor URL Building
- Replace the direct string concatenation with the query builder pattern
- Convert the sequence of conditional parameter additions to a more structured approach
- Group related parameters together for better code organization

### Step 5: Extract Error Handling
- Move the response error handling logic to a separate helper function
- This will make the main function flow clearer and reduce nesting

### Step 6: Test Thoroughly
- Ensure the refactored function behaves exactly as the original
- Add specific tests for the new helper functions
- Verify all parameter combinations work correctly

### Step 7: Apply the Same Pattern to Other Functions
- Once the approach is validated, apply similar refactoring to other API methods
- This will improve consistency across the codebase

By implementing these steps, we should be able to significantly reduce the cyclomatic complexity while maintaining the same functionality and improving the maintainability of the code. 