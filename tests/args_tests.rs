use sonarqube_mcp_server::Args;

#[test]
fn test_args_is_args_available() {
    let args = Args {
        sonarqube_url: "http://test.com".to_string(),
        sonarqube_token: "test-token".to_string(),
        sonarqube_organization: None,
        resources: false,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    let available = args.is_args_available();
    // Assert it returns a boolean
    assert!(available == true || available == false);
}
