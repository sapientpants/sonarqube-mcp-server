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
- [ ] Line 55: Various enums and structs (review)
- [ ] Line 47: Various enums and structs (review)
- [ ] Line 41: Various enums and structs (review)
- [x] Line 33: Various enums and structs (review) - FIXED (`From<serde_json::Error>` implementation for `SonarError`)
- [x] Line 4: Module level documentation - FIXED

### src/mcp/utilities.rs
- [x] Line 49: Public function or struct - FIXED (roots_list)
- [x] Line 45: Public function or struct - FIXED (logging_set_level)
- [x] Line 41: Public function or struct - FIXED (ping)

### src/mcp/types.rs
- [ ] Line 367 and multiple others: Add documentation to public items in this file

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
- [ ] Lines 1-6: Module level documentation and public items

### src/lib.rs
- [ ] Line 1: Crate level documentation

## Other Issues

### Bug Risk Issues
- [ ] tests/end_to_end_tests.rs:40 - RS-E1021: Called `mem::forget` or `mem::drop` on a non-Drop type

### Anti-Pattern Issues
- [ ] src/mcp/sonarqube/client.rs:116 - RS-R1000: Function with cyclomatic complexity higher than threshold
- [ ] tests/end_to_end_tests.rs:162 - RS-W1079: Empty call to `new()`
- [ ] src/main.rs:86 - RS-W1079: Empty call to `new()`

## Progress Tracking

Total issues: 84
- Fixed: 52
- Remaining: 32

Most issues are documentation-related. After completing documentation, priority should be given to addressing bug risk and anti-pattern issues.

As a general approach, start with the most critical and commonly used structures and modules. 