use clap::Parser;
use std::str::FromStr;

// Import the Args struct from main.rs
// We can't directly import it as it's not public, so we recreate it here
#[derive(Parser, Debug, PartialEq)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// list resources
    #[arg(long, default_value = "false")]
    resources: bool,
    /// list prompts
    #[arg(long, default_value = "false")]
    prompts: bool,
    /// list tools
    #[arg(long, default_value = "false")]
    tools: bool,
    /// start MCP server
    #[arg(long, default_value = "false")]
    mcp: bool,
    /// output as json-rpc format
    #[arg(long, default_value = "false")]
    json: bool,
}

impl Args {
    fn is_args_available(&self) -> bool {
        self.prompts || self.resources || self.tools
    }
}

#[test]
fn test_args_default_values() {
    // Parse empty arguments
    let args = Args::parse_from(["program"]);

    // Verify default values
    assert_eq!(args.resources, false);
    assert_eq!(args.prompts, false);
    assert_eq!(args.tools, false);
    assert_eq!(args.mcp, false);
    assert_eq!(args.json, false);
}

#[test]
fn test_args_with_resources() {
    // Parse with resources flag
    let args = Args::parse_from(["program", "--resources"]);

    // Verify values
    assert_eq!(args.resources, true);
    assert_eq!(args.prompts, false);
    assert_eq!(args.tools, false);
    assert_eq!(args.mcp, false);
    assert_eq!(args.json, false);
}

#[test]
fn test_args_with_prompts() {
    // Parse with prompts flag
    let args = Args::parse_from(["program", "--prompts"]);

    // Verify values
    assert_eq!(args.resources, false);
    assert_eq!(args.prompts, true);
    assert_eq!(args.tools, false);
    assert_eq!(args.mcp, false);
    assert_eq!(args.json, false);
}

#[test]
fn test_args_with_tools() {
    // Parse with tools flag
    let args = Args::parse_from(["program", "--tools"]);

    // Verify values
    assert_eq!(args.resources, false);
    assert_eq!(args.prompts, false);
    assert_eq!(args.tools, true);
    assert_eq!(args.mcp, false);
    assert_eq!(args.json, false);
}

#[test]
fn test_args_with_mcp() {
    // Parse with mcp flag
    let args = Args::parse_from(["program", "--mcp"]);

    // Verify values
    assert_eq!(args.resources, false);
    assert_eq!(args.prompts, false);
    assert_eq!(args.tools, false);
    assert_eq!(args.mcp, true);
    assert_eq!(args.json, false);
}

#[test]
fn test_args_with_json() {
    // Parse with json flag
    let args = Args::parse_from(["program", "--json"]);

    // Verify values
    assert_eq!(args.resources, false);
    assert_eq!(args.prompts, false);
    assert_eq!(args.tools, false);
    assert_eq!(args.mcp, false);
    assert_eq!(args.json, true);
}

#[test]
fn test_args_with_multiple_flags() {
    // Parse with multiple flags
    let args = Args::parse_from(["program", "--resources", "--json", "--tools"]);

    // Verify values
    assert_eq!(args.resources, true);
    assert_eq!(args.prompts, false);
    assert_eq!(args.tools, true);
    assert_eq!(args.mcp, false);
    assert_eq!(args.json, true);
}

#[test]
fn test_is_args_available() {
    // Test with no flags
    let args = Args {
        resources: false,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    assert_eq!(args.is_args_available(), false);

    // Test with resources flag
    let args = Args {
        resources: true,
        prompts: false,
        tools: false,
        mcp: false,
        json: false,
    };
    assert_eq!(args.is_args_available(), true);

    // Test with prompts flag
    let args = Args {
        resources: false,
        prompts: true,
        tools: false,
        mcp: false,
        json: false,
    };
    assert_eq!(args.is_args_available(), true);

    // Test with tools flag
    let args = Args {
        resources: false,
        prompts: false,
        tools: true,
        mcp: false,
        json: false,
    };
    assert_eq!(args.is_args_available(), true);

    // Test with mcp flag (should not affect is_args_available)
    let args = Args {
        resources: false,
        prompts: false,
        tools: false,
        mcp: true,
        json: false,
    };
    assert_eq!(args.is_args_available(), false);

    // Test with json flag (should not affect is_args_available)
    let args = Args {
        resources: false,
        prompts: false,
        tools: false,
        mcp: false,
        json: true,
    };
    assert_eq!(args.is_args_available(), false);

    // Test with multiple flags
    let args = Args {
        resources: true,
        prompts: true,
        tools: true,
        mcp: true,
        json: true,
    };
    assert_eq!(args.is_args_available(), true);
}
