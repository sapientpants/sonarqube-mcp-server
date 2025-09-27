#!/usr/bin/env node
/**
 * Hook to prevent git commands with --no-verify flag from being executed.
 * This ensures all git hooks and verification steps are properly executed.
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';

interface ToolInput {
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
}

function main(): void {
  try {
    // Read JSON input from stdin
    const inputData = readFileSync(0, 'utf-8');
    const parsedInput: ToolInput = JSON.parse(inputData);

    // Extract tool information
    const toolName = parsedInput.tool_name ?? '';
    const toolInput = parsedInput.tool_input ?? {};

    // Only process Bash tool calls
    if (toolName !== 'Bash') {
      process.exit(0);
    }

    // Get the command from tool_input
    const command = toolInput.command ?? '';

    // Check if it's a git command
    if (!/\bgit\b/.test(command)) {
      process.exit(0);
    }

    // Remove quoted strings to avoid false positives
    // Remove single-quoted strings
    let cleanedCmd = command.replace(/'[^']*'/g, '');
    // Remove double-quoted strings
    cleanedCmd = cleanedCmd.replace(/"[^"]*"/g, '');

    // Check for --no-verify or -n flag
    const noVerifyPattern = /(^|\s)--no-verify($|=|\s)/;
    const shortNPattern = /(^|\s)-n($|\s)/;

    if (noVerifyPattern.test(cleanedCmd) || shortNPattern.test(cleanedCmd)) {
      // Block with error message (exit code 2)
      // eslint-disable-next-line no-console
      console.error('Error: Git commands with --no-verify flag are not allowed.');
      // eslint-disable-next-line no-console
      console.error('This ensures all git hooks and verification steps are properly executed.');
      // eslint-disable-next-line no-console
      console.error('Please run the git command without the --no-verify flag.');
      process.exit(2);
    }

    // Allow the command to proceed
    process.exit(0);
  } catch {
    // For any errors (including JSON parsing), allow the command (fail open)
    process.exit(0);
  }
}

main();
