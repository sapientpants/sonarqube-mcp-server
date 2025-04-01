# DeepSource Issues Todo List

## Major Issues

### Bug Risk
- [x] **Found string literal in `env` functions** (RS-W1015)
  - File: `tests/helpers.rs:8`
  - Description: Replace string literals in `std::env` functions with static strings to prevent spelling errors
  - Recommendation: Use static string constants for environment variables
  - ✅ Fixed: Added static constant `CARGO_MANIFEST_DIR` and replaced string literal

## Minor Issues

### Documentation
- [ ] **Undocumented public items** (RS-D1001)
  - Add documentation for public items in:
    - `src/server/mod.rs:95`
    - `src/server/mod.rs:70`
    - `src/mcp/types.rs:698`
    - `src/mcp/types.rs:684`
    - `src/mcp/types.rs:629`
    - `src/main.rs:8`
    - `src/lib.rs:21`
    - `src/mcp/types.rs:67`
    - `src/mcp/types.rs:41`
    - `src/mcp/types.rs:77`
    - `src/mcp/mod.rs:23`
    - `src/mcp/mod.rs:22`
    - `src/mcp/mod.rs:21`
    - `src/mcp/mod.rs:20`
    - `src/mcp/mod.rs:19`
    - `src/lib.rs:20`

### Bug Risk
- [ ] **Array-expression with zero length** (RS-W1096)
  - File: `src/mcp/sonarqube/query.rs:208`
  - Description: Zero-length array initialization found
  - Recommendation: Consider using `PhantomData` for marker types or adjust array size if storage is needed

## How to Fix

1. **Documentation Issues**:
   - Add rustdoc comments (`///`) or doc attributes (`#[doc = "..."]`) to all public items
   - Document the purpose, parameters, and return values where applicable

2. **Environment Variables**:
   - Replace string literals with static constants
   - Example:
     ```rust
     static ENV_VAR_NAME: &str = "ENV_VAR_NAME";
     std::env::var(ENV_VAR_NAME);
     ```

3. **Zero-length Arrays**:
   - If used as marker type, replace with `std::marker::PhantomData`
   - If used for storage, ensure proper size is specified 