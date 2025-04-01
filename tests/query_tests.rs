mod helpers;

use sonarqube_mcp_server::mcp::sonarqube::query::*;
use std::collections::HashMap;

#[test]
fn test_query_builder_add_params_method() {
    // Create a map of parameters
    let mut params = HashMap::new();
    params.insert("param1", Some("value1".to_string()));
    params.insert("param2", Some("value2".to_string()));
    params.insert("param3", None::<String>);

    // Test adding multiple parameters at once using add_params
    let url = QueryBuilder::new("https://example.com/api")
        .add_params(params)
        .build();

    // The URL should contain param1 and param2, but not param3
    assert!(url.contains("param1=value1"));
    assert!(url.contains("param2=value2"));
    assert!(!url.contains("param3"));
    assert!(url.contains("?") && url.contains("&"));
}

#[test]
fn test_empty_values_handling() {
    // Test empty string
    let url = QueryBuilder::new("https://example.com/api")
        .add_param("empty", Some(""))
        .build();
    assert_eq!(url, "https://example.com/api?empty=");

    // Test spaces in values
    let url = QueryBuilder::new("https://example.com/api")
        .add_param("spaces", Some("with spaces"))
        .build();
    assert_eq!(url, "https://example.com/api?spaces=with%20spaces");

    // Test special characters
    let url = QueryBuilder::new("https://example.com/api")
        .add_param("special", Some("?&=#+"))
        .build();
    assert_eq!(url, "https://example.com/api?special=%3F%26%3D%23%2B");
}

#[test]
fn test_combining_parameter_types() {
    // Test combining all parameter types
    let severities = ["MAJOR", "CRITICAL"];
    let url = QueryBuilder::new("https://example.com/api")
        .add_param("project", Some("my-project"))
        .add_bool_param("resolved", Some(false))
        .add_array_param("severities", Some(&severities))
        .build();

    assert!(url.contains("project=my-project"));
    assert!(url.contains("resolved=false"));
    assert!(url.contains("severities=MAJOR%2CCRITICAL"));
}
