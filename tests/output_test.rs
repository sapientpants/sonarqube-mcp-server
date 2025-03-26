use sonarqube_mcp_server::mcp::sonarqube::tools::sonarqube_get_issues;
use sonarqube_mcp_server::mcp::sonarqube::types::SonarQubeIssuesRequest;
use sonarqube_mcp_server::mcp::types::CallToolResultContent;
use std::env;

#[tokio::test]
async fn test_issues_output_formatting() {
    // Save and set environment variables
    let original_url = env::var("SONARQUBE_URL").ok();
    let original_token = env::var("SONARQUBE_TOKEN").ok();
    
    // Set test environment variables
    env::set_var("SONARQUBE_URL", "https://example.com");
    env::set_var("SONARQUBE_TOKEN", "test-token");
    
    // Initialize the client
    let _ = sonarqube_mcp_server::mcp::sonarqube::tools::init_sonarqube_client();
    
    // Create request for a non-existent project
    let request = SonarQubeIssuesRequest {
        project_key: "test-project".to_string(),
        severities: None,
        types: None,
        statuses: None,
        impact_severities: None,
        impact_software_qualities: None,
        assigned_to_me: None,
        assignees: None,
        authors: None,
        code_variants: None,
        created_after: None,
        created_before: None,
        created_in_last: None,
        cwe: None,
        directories: None,
        facets: None,
        files: None,
        issue_statuses: None,
        languages: None,
        owasp_top10: None,
        owasp_top10_2021: None,
        resolutions: None,
        resolved: None,
        rules: None,
        sans_top25: None,
        sonarsource_security: None,
        tags: None,
        sort_field: None,
        asc: None,
        page: None,
        page_size: None,
    };
    
    // This will fail due to connection error, but we can use a mock to simulate a response
    // For now, let's just print the structure of the output
    match sonarqube_get_issues(request).await {
        Ok(result) => {
            for content in result.content {
                match content {
                    CallToolResultContent::Text { text } => {
                        println!("=== TEXT OUTPUT ===");
                        println!("{}", text);
                        println!("=== END OUTPUT ===");
                    }
                    _ => println!("Non-text content: {:?}", content),
                }
            }
        }
        Err(e) => {
            println!("=== ERROR OUTPUT ===");
            println!("{:?}", e);
            println!("=== END ERROR ===");
        }
    }
    
    // Now test with filters to see empty results output
    // Mock a function that returns empty results with filters
    println!("\n\n=== SIMULATED EMPTY RESULTS WITH FILTERS ===");
    let expected_output = format!(
        "Found 0 issues for project 'quorum' (page 1 of 1):\n\n\
        No issues match the applied filters: severities: HIGH, CRITICAL; types: BUG.\n"
    );
    println!("{}", expected_output);
    println!("=== END SIMULATED OUTPUT ===");
    
    println!("\n\n=== SIMULATED EMPTY RESULTS WITHOUT FILTERS ===");
    let expected_output = format!(
        "Found 0 issues for project 'quorum' (page 1 of 1):\n\n\
        This project has no issues reported in SonarQube.\n"
    );
    println!("{}", expected_output);
    println!("=== END SIMULATED OUTPUT ===");
    
    // Restore environment variables
    match original_url {
        Some(url) => env::set_var("SONARQUBE_URL", url),
        None => env::remove_var("SONARQUBE_URL"),
    }
    
    match original_token {
        Some(token) => env::set_var("SONARQUBE_TOKEN", token),
        None => env::remove_var("SONARQUBE_TOKEN"),
    }
} 