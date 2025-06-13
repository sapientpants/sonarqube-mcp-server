# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

See [README.md](./README.md) for the complete project overview, features, and usage documentation.

## Architecture Decision Records (ADRs)

This project uses adr-tools to document architectural decisions. ADRs are stored in `doc/architecture/decisions/`.

```bash
# Create a new ADR without opening an editor (prevents timeout in Claude Code)
EDITOR=true adr-new "Title of the decision"

# Then edit the created file manually
```

All architectural decisions are documented in Architecture Decision Records (ADRs) located in `doc/architecture/decisions/`. These ADRs are the single source of truth for understanding the design and architecture of this library.

Refer to the ADRs for detailed information about design rationale, implementation details, and consequences of each architectural decision.

## Claude-Specific Tips

- Remember to use the ADR creation command with `EDITOR=true` to prevent timeouts in Claude Code
- Use `jq` to read json files when analyzing test results or configuration
- Never use `--no-verify` when committing code. This bypasses pre-commit hooks which run important validation checks.
