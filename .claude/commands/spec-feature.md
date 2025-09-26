# Spec a Feature

You are about to create a feature specification in Gherkin format and turn it into a GitHub issue ready for implementation.

## Process

1. **Gather Requirements**
   - Ask the user for the feature name and description if not provided
   - Understand the business value and user needs
   - Identify scope, non-goals, and risks

2. **Write Gherkin Specification**
   Create a comprehensive specification including:
   - **Feature** name and description
   - **Background** (if needed)
   - **Scenarios** using Given/When/Then format
   - **Examples** with data tables where appropriate
   - **Acceptance Criteria**
   - **Non-Goals** (what this feature won't do)
   - **Risks & Mitigations**
   - **Technical Considerations**

3. **Format as GitHub Issue**
   Structure the issue with:
   - Clear title: `feat: [Feature Name]`
   - Labels: `enhancement`, `needs-implementation`
   - Milestone (if applicable)
   - Complete Gherkin specification in the body
   - Testing requirements

4. **Create the Issue**
   Use the `gh` CLI to create the issue:
   ```bash
   gh issue create --title "feat: [Feature Name]" \
     --body "[Full specification]" \
     --label enhancement \
     --label needs-implementation
   ```

## Template for Issue Body

````markdown
## Feature: [Feature Name]

### Business Value

[Describe the business value and user benefit]

### User Story

As a [type of user]
I want [goal/desire]
So that [benefit/value]

### Gherkin Specification

```gherkin
Feature: [Feature Name]
  [Feature description explaining the feature's purpose]

  Background:
    Given [common preconditions for all scenarios]

  Scenario: [Happy path scenario]
    Given [initial context]
    When [action/event]
    Then [expected outcome]
    And [additional outcomes]

  Scenario: [Edge case or error scenario]
    Given [initial context]
    When [action/event]
    Then [expected outcome]

  Scenario Outline: [Parameterized scenario if needed]
    Given [context with <parameter>]
    When [action with <parameter>]
    Then [outcome with <expected>]

    Examples:
      | parameter | expected |
      | value1    | result1  |
      | value2    | result2  |
```
````

### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Non-Goals

- This feature will NOT [explicitly excluded functionality]
- Out of scope: [related but excluded items]

### Risks & Mitigations

- **Risk**: [Potential risk]
  **Mitigation**: [How to address it]

### Technical Considerations

- Architecture impact: [if any]
- Performance considerations: [if any]
- Security considerations: [if any]
- Dependencies: [external dependencies or prerequisites]

### Testing Requirements

- Unit test coverage for all new functions
- Property-based tests for business logic invariants
- Integration tests for external interactions
- Edge cases and error scenarios covered

### Definition of Done

- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Changeset added
- [ ] No security vulnerabilities
- [ ] Performance requirements met

````

## Important Notes

1. **Be Specific**: Write clear, unambiguous scenarios
2. **Focus on Behavior**: Describe WHAT, not HOW
3. **Keep it Testable**: Each scenario should be verifiable
4. **Consider Edge Cases**: Include error and boundary scenarios
5. **Make it Implementable**: Provide enough detail for the `implement-github-issue` command

## Example Output

After gathering requirements, create an issue like:

```bash
gh issue create --title "feat: Add user authentication with JWT" \
  --body "## Feature: User Authentication with JWT

### Business Value
Enable secure user authentication to protect user data and provide personalized experiences.

### User Story
As a user
I want to securely log in to the application
So that I can access my personal data and features

### Gherkin Specification
[... full specification ...]" \
  --label enhancement \
  --label needs-implementation
````

The created issue will be ready for implementation using the `/implement-github-issue` command.
