# SonarQube MCP Server Refactoring Plan

## Overview
This document tracks the refactoring tasks to improve code structure, readability, and maintainability.

## Refactoring Tasks

### 1. API Module Improvements ✅

#### Task 1.1: Rename generic type alias (api.ts:9)
- [x] Rename `ParamRecord` to `QueryParameters` for better clarity
- Current: `export type ParamRecord = Record<string, string | number | boolean | string[] | undefined | null>;`
- Target: `export type QueryParameters = Record<string, string | number | boolean | string[] | undefined | null>;`
- **Completed**: Renamed throughout api.ts

#### Task 1.2: Remove redundant wrapper functions (api.ts:100-126)
- [x] Remove `apiGet` and `apiPost` functions that just delegate to `defaultHttpClient`
- Update all imports to use `defaultHttpClient` directly
- **Completed**: Removed wrapper functions and updated tests to use AxiosHttpClient directly

### 2. SonarQube Client Refactoring

#### Task 2.1: Extract parameter transformation helper (sonarqube.ts)
- [x] Create `arrayToCommaSeparated` helper function
- [x] Apply to repeated patterns in:
  - getIssues (lines 624-717)
  - getMeasuresComponent (lines 796-841)
  - getMeasuresComponents (lines 859-869)
- **Completed**: Created helper function and applied to all array?.join(',') patterns

#### Task 2.2: Extract API URL constant (sonarqube.ts:606)
- [ ] Replace magic string 'https://sonarcloud.io' with `DEFAULT_SONARQUBE_URL` constant

#### Task 2.3: Improve error handling in getSourceCode (sonarqube.ts:977-1003)
- [ ] Add proper error logging instead of silently failing
- [ ] Consider throwing or returning error state

#### Task 2.4: Extract types to separate files
- [ ] Create `src/types/` directory
- [ ] Move project-related interfaces to `src/types/projects.ts`
- [ ] Move issue-related interfaces to `src/types/issues.ts`
- [ ] Move measure-related interfaces to `src/types/measures.ts`
- [ ] Move system-related interfaces to `src/types/system.ts`
- [ ] Move quality-gate interfaces to `src/types/quality-gates.ts`
- [ ] Move source-code interfaces to `src/types/source-code.ts`

### 3. Index.ts Modularization

#### Task 3.1: Extract handler factory function
- [ ] Create generic `createHandler` function to reduce duplication
- [ ] Apply to all handlers (lines 82-467)

#### Task 3.2: Extract modules
- [ ] Create `src/handlers.ts` for all handler functions
- [ ] Create `src/lambdas.ts` for all lambda functions
- [ ] Create `src/tools.ts` for tool registration logic
- [ ] Create `src/server.ts` for server initialization

#### Task 3.3: Simplify parameter transformations
- [ ] Extract common transformation patterns
- [ ] Create reusable transformation utilities

#### Task 3.4: Improve type safety
- [ ] Reduce type assertions by improving type definitions
- [ ] Create proper typed interfaces for handler parameters

### 4. Code Quality Improvements

#### Task 4.1: Remove dead code
- [ ] Remove duplicate `SonarQubeApiComponent` interface (sonarqube.ts:273-279)

#### Task 4.2: Consolidate null handling
- [ ] Create centralized parameter transformation utility
- [ ] Apply consistently across all handlers

## Execution Order

1. Start with API module improvements (smallest scope)
2. Extract helper functions in SonarQube client
3. Extract types to separate files
4. Modularize index.ts into separate concerns
5. Final cleanup and validation

## Progress Tracking

- [ ] Phase 1: API module refactoring
- [ ] Phase 2: SonarQube client improvements
- [ ] Phase 3: Type extraction and organization
- [ ] Phase 4: Index.ts modularization
- [ ] Phase 5: Final cleanup

Each task will be committed separately with descriptive commit messages following the pattern: `refactor: <description>`