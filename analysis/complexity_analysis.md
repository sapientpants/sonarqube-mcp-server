# Complexity Analysis: get_issues Function

## Sources of Complexity

After reviewing the `get_issues` function in `src/mcp/sonarqube/client.rs`, I've identified the following sources of complexity:

1. **Repetitive Parameter Handling**: The function contains approximately 30 conditional blocks that follow the same pattern, checking if an optional parameter exists and then appending it to the URL if it does. These repetitive patterns significantly contribute to the cyclomatic complexity.

2. **Parameter Types**: There are multiple types of parameters being handled:
   - Single value parameters (e.g., `created_after`, `sort_field`)
   - Boolean parameters (e.g., `assigned_to_me`, `resolved`)
   - Array parameters that need to be joined with commas (e.g., `severities`, `types`)

3. **URL Construction**: The function manually constructs a query URL by appending parameters. This approach leads to repetitive string formatting code.

4. **Error Handling**: Multiple nested error handling blocks add to the complexity:
   - HTTP status code checking
   - Response body parsing
   - Error type mapping

5. **Prefix Pattern**: All parameters are prefixed with "&" and follow a "parameter=value" pattern, but this is repeated manually for each parameter.

## Parameter Handling Patterns

Looking at the code, I identified these repeated patterns:

1. **Boolean Parameter Pattern**:
```rust
if let Some(assigned_to_me) = params.assigned_to_me {
    url.push_str(&format!("&assignedToMe={}", assigned_to_me));
}
```

2. **String Parameter Pattern**:
```rust
if let Some(created_after) = params.created_after {
    url.push_str(&format!("&createdAfter={}", created_after));
}
```

3. **Array Parameter Pattern**:
```rust
if let Some(sevs) = params.severities {
    url.push_str(&format!("&severities={}", sevs.join(",")));
}
```

## Error Handling Pattern

The error handling follows this pattern:
```rust
if !response.status().is_success() {
    let status = response.status();
    if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err(SonarError::AuthError);
    }
    if status.as_u16() == 404 {
        return Err(SonarError::ProjectNotFound(params.project_key.to_string()));
    }

    let error_text = response
        .text()
        .await
        .unwrap_or_else(|_| "Unknown error".to_string());
    return Err(SonarError::Api(format!("HTTP {}: {}", status, error_text)));
}
```

## Structure of IssuesQueryParams

The `IssuesQueryParams` struct contains about 30 optional fields which all need to be processed:

```rust
pub struct IssuesQueryParams<'a> {
    pub project_key: &'a str,
    pub severities: Option<&'a [&'a str]>,
    pub types: Option<&'a [&'a str]>,
    pub statuses: Option<&'a [&'a str]>,
    pub impact_severities: Option<&'a [&'a str]>,
    pub impact_software_qualities: Option<&'a [&'a str]>,
    pub assigned_to_me: Option<bool>,
    pub assignees: Option<&'a [&'a str]>,
    // ... and many more similar fields
}
```

## Opportunities for Improvement

1. **Helper Functions**: We can create helper functions to handle the repetitive parameter patterns:
   - One for boolean parameters
   - One for string parameters
   - One for array parameters

2. **Query Builder Pattern**: Implement a QueryBuilder that can handle different parameter types and properly construct the URL with all query parameters.

3. **Response Handling Extraction**: Move the error handling logic to a dedicated helper function to reduce nesting and make the code more readable.

4. **Parameter Grouping**: Group related parameters together for a more structured approach to building the query.

## Conclusion

The high cyclomatic complexity in the `get_issues` function stems primarily from the large number of optional parameters and the repetitive way they're handled. By implementing helper functions and a more structured query-building approach, we can significantly reduce this complexity while maintaining the same functionality. 