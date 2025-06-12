import { z } from 'zod';
import {
  issuesToolSchema,
  markIssueFalsePositiveToolSchema,
  markIssueWontFixToolSchema,
  markIssuesFalsePositiveToolSchema,
  markIssuesWontFixToolSchema,
  addCommentToIssueToolSchema,
  assignIssueToolSchema,
  confirmIssueToolSchema,
  unconfirmIssueToolSchema,
  resolveIssueToolSchema,
  reopenIssueToolSchema,
} from '../../schemas/issues.js';

describe('issuesToolSchema', () => {
  it('should validate minimal issues parameters', () => {
    const input = {};
    const result = z.object(issuesToolSchema).parse(input);
    expect(result).toEqual({});
  });

  it('should validate issues with project key', () => {
    const input = {
      project_key: 'my-project',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.project_key).toBe('my-project');
  });

  it('should validate issues with all filter parameters', () => {
    const input = {
      project_key: 'my-project',
      projects: ['proj1', 'proj2'],
      branch: 'main',
      pull_request: '123',
      issues: ['ISSUE-1', 'ISSUE-2'],
      severities: ['BLOCKER', 'CRITICAL'],
      severity: 'MAJOR',
      statuses: ['OPEN', 'CONFIRMED'],
      issue_statuses: ['OPEN', 'CONFIRMED'],
      resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
      resolved: true,
      rules: ['java:S1234', 'java:S5678'],
      tags: ['security', 'performance'],
      types: ['BUG', 'VULNERABILITY'],
      languages: ['java', 'javascript'],
      component_keys: ['comp1', 'comp2'],
      components: ['comp3', 'comp4'],
      on_component_only: false,
      created_after: '2023-01-01',
      created_before: '2023-12-31',
      created_at: '2023-06-15',
      created_in_last: '7d',
      assigned: true,
      assignees: ['user1', 'user2'],
      author: 'author1',
      authors: ['author1', 'author2'],
      cwe: ['79', '89'],
      owasp_top10: ['a1', 'a3'],
      owasp_top10_v2021: ['a01', 'a03'],
      sans_top25: ['insecure-interaction', 'risky-resource'],
      sonarsource_security: ['sql-injection', 'xss'],
      sonarsource_security_category: ['injection'],
      clean_code_attribute_categories: ['INTENTIONAL', 'RESPONSIBLE'],
      impact_severities: ['HIGH', 'MEDIUM'],
      impact_software_qualities: ['SECURITY', 'RELIABILITY'],
      facets: ['severities', 'types'],
      facet_mode: 'effort',
      additional_fields: ['_all'],
      in_new_code_period: true,
      since_leak_period: false,
      s: 'FILE_LINE',
      asc: false,
      page: '2',
      page_size: '50',
    };

    const result = z.object(issuesToolSchema).parse(input);
    expect(result.project_key).toBe('my-project');
    expect(result.projects).toEqual(['proj1', 'proj2']);
    expect(result.severities).toEqual(['BLOCKER', 'CRITICAL']);
    expect(result.impact_severities).toEqual(['HIGH', 'MEDIUM']);
    expect(result.clean_code_attribute_categories).toEqual(['INTENTIONAL', 'RESPONSIBLE']);
  });

  it('should handle null values for optional arrays', () => {
    const input = {
      projects: null,
      severities: null,
      tags: null,
      rules: null,
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.projects).toBeNull();
    expect(result.severities).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.rules).toBeNull();
  });

  it('should handle boolean string conversions', () => {
    const input = {
      resolved: 'true',
      assigned: 'false',
      on_component_only: 'true',
      in_new_code_period: 'false',
      since_leak_period: 'true',
      asc: 'false',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.resolved).toBe(true);
    expect(result.assigned).toBe(false);
    expect(result.on_component_only).toBe(true);
    expect(result.in_new_code_period).toBe(false);
    expect(result.since_leak_period).toBe(true);
    expect(result.asc).toBe(false);
  });

  it('should handle page number string conversions', () => {
    const input = {
      page: '3',
      page_size: '25',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.page).toBe(3);
    expect(result.page_size).toBe(25);
  });

  it('should reject invalid severity values', () => {
    const input = {
      severities: ['INVALID'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid status values', () => {
    const input = {
      statuses: ['INVALID_STATUS'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid impact severity values', () => {
    const input = {
      impact_severities: ['VERY_HIGH'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid clean code categories', () => {
    const input = {
      clean_code_attribute_categories: ['INVALID_CATEGORY'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should handle empty arrays', () => {
    const input = {
      projects: [],
      tags: [],
      rules: [],
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.projects).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.rules).toEqual([]);
  });

  it('should handle partial parameters', () => {
    const input = {
      project_key: 'test',
      severities: ['MAJOR'],
      page: '1',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.project_key).toBe('test');
    expect(result.severities).toEqual(['MAJOR']);
    expect(result.page).toBe(1);
    expect(result.branch).toBeUndefined();
    expect(result.tags).toBeUndefined();
  });
});

describe('markIssueFalsePositiveToolSchema', () => {
  it('should validate minimal parameters with issue key', () => {
    const input = {
      issue_key: 'ISSUE-123',
    };
    const result = z.object(markIssueFalsePositiveToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-123');
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_key: 'ISSUE-123',
      comment: 'This is a false positive because...',
    };
    const result = z.object(markIssueFalsePositiveToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-123');
    expect(result.comment).toBe('This is a false positive because...');
  });

  it('should reject missing issue key', () => {
    const input = {
      comment: 'Missing issue key',
    };
    expect(() => z.object(markIssueFalsePositiveToolSchema).parse(input)).toThrow();
  });
});

describe('markIssueWontFixToolSchema', () => {
  it('should validate minimal parameters with issue key', () => {
    const input = {
      issue_key: 'ISSUE-456',
    };
    const result = z.object(markIssueWontFixToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-456');
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_key: 'ISSUE-456',
      comment: "Won't fix because it's acceptable in this context",
    };
    const result = z.object(markIssueWontFixToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-456');
    expect(result.comment).toBe("Won't fix because it's acceptable in this context");
  });

  it('should reject missing issue key', () => {
    const input = {
      comment: 'Missing issue key',
    };
    expect(() => z.object(markIssueWontFixToolSchema).parse(input)).toThrow();
  });
});

describe('markIssuesFalsePositiveToolSchema', () => {
  it('should validate minimal parameters with issue keys array', () => {
    const input = {
      issue_keys: ['ISSUE-123', 'ISSUE-124', 'ISSUE-125'],
    };
    const result = z.object(markIssuesFalsePositiveToolSchema).parse(input);
    expect(result.issue_keys).toEqual(['ISSUE-123', 'ISSUE-124', 'ISSUE-125']);
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_keys: ['ISSUE-123', 'ISSUE-124'],
      comment: 'Bulk marking as false positives',
    };
    const result = z.object(markIssuesFalsePositiveToolSchema).parse(input);
    expect(result.issue_keys).toEqual(['ISSUE-123', 'ISSUE-124']);
    expect(result.comment).toBe('Bulk marking as false positives');
  });

  it('should validate single issue in array', () => {
    const input = {
      issue_keys: ['ISSUE-123'],
    };
    const result = z.object(markIssuesFalsePositiveToolSchema).parse(input);
    expect(result.issue_keys).toEqual(['ISSUE-123']);
  });

  it('should reject empty issue keys array', () => {
    const input = {
      issue_keys: [],
    };
    expect(() => z.object(markIssuesFalsePositiveToolSchema).parse(input)).toThrow();
  });

  it('should reject missing issue keys', () => {
    const input = {
      comment: 'Missing issue keys',
    };
    expect(() => z.object(markIssuesFalsePositiveToolSchema).parse(input)).toThrow();
  });
});

describe('markIssuesWontFixToolSchema', () => {
  it('should validate minimal parameters with issue keys array', () => {
    const input = {
      issue_keys: ['ISSUE-456', 'ISSUE-457', 'ISSUE-458'],
    };
    const result = z.object(markIssuesWontFixToolSchema).parse(input);
    expect(result.issue_keys).toEqual(['ISSUE-456', 'ISSUE-457', 'ISSUE-458']);
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_keys: ['ISSUE-456', 'ISSUE-457'],
      comment: "Bulk marking as won't fix",
    };
    const result = z.object(markIssuesWontFixToolSchema).parse(input);
    expect(result.issue_keys).toEqual(['ISSUE-456', 'ISSUE-457']);
    expect(result.comment).toBe("Bulk marking as won't fix");
  });

  it('should validate single issue in array', () => {
    const input = {
      issue_keys: ['ISSUE-456'],
    };
    const result = z.object(markIssuesWontFixToolSchema).parse(input);
    expect(result.issue_keys).toEqual(['ISSUE-456']);
  });

  it('should reject empty issue keys array', () => {
    const input = {
      issue_keys: [],
    };
    expect(() => z.object(markIssuesWontFixToolSchema).parse(input)).toThrow();
  });

  it('should reject missing issue keys', () => {
    const input = {
      comment: 'Missing issue keys',
    };
    expect(() => z.object(markIssuesWontFixToolSchema).parse(input)).toThrow();
  });
});

describe('addCommentToIssueToolSchema', () => {
  it('should validate parameters with issue key and text', () => {
    const input = {
      issue_key: 'ISSUE-789',
      text: 'This is a comment with **markdown** support',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-789');
    expect(result.text).toBe('This is a comment with **markdown** support');
  });

  it('should validate plain text comment', () => {
    const input = {
      issue_key: 'ISSUE-100',
      text: 'Plain text comment without formatting',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-100');
    expect(result.text).toBe('Plain text comment without formatting');
  });

  it('should validate multi-line comment', () => {
    const input = {
      issue_key: 'ISSUE-200',
      text: 'Line 1\nLine 2\n\n- Bullet point\n- Another bullet',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-200');
    expect(result.text).toBe('Line 1\nLine 2\n\n- Bullet point\n- Another bullet');
  });

  it('should validate markdown with code blocks', () => {
    const input = {
      issue_key: 'ISSUE-300',
      text: 'Here is some code:\n\n```java\npublic void test() {\n  System.out.println("Hello");\n}\n```',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-300');
    expect(result.text).toContain('```java');
  });

  it('should reject missing issue key', () => {
    const input = {
      text: 'Comment without issue key',
    };
    expect(() => z.object(addCommentToIssueToolSchema).parse(input)).toThrow();
  });

  it('should reject missing text', () => {
    const input = {
      issue_key: 'ISSUE-789',
    };
    expect(() => z.object(addCommentToIssueToolSchema).parse(input)).toThrow();
  });

  it('should reject empty text', () => {
    const input = {
      issue_key: 'ISSUE-789',
      text: '',
    };
    expect(() => z.object(addCommentToIssueToolSchema).parse(input)).toThrow();
  });

  it('should reject empty issue key', () => {
    const input = {
      issue_key: '',
      text: 'Valid comment',
    };
    expect(() => z.object(addCommentToIssueToolSchema).parse(input)).toThrow();
  });

  it('should accept single character text', () => {
    const input = {
      issue_key: 'ISSUE-789',
      text: 'X',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.text).toBe('X');
  });

  it('should handle very long comments', () => {
    const longText = 'A'.repeat(10000);
    const input = {
      issue_key: 'ISSUE-789',
      text: longText,
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.text).toBe(longText);
  });

  it('should handle special characters in comments', () => {
    const input = {
      issue_key: 'ISSUE-789',
      text: 'Special chars: <>&"\'`@#$%^&*()[]{}|\\;:,.?/',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.text).toBe('Special chars: <>&"\'`@#$%^&*()[]{}|\\;:,.?/');
  });

  it('should handle Unicode characters', () => {
    const input = {
      issue_key: 'ISSUE-789',
      text: 'Unicode: 😀 你好 مرحبا こんにちは',
    };
    const result = z.object(addCommentToIssueToolSchema).parse(input);
    expect(result.text).toBe('Unicode: 😀 你好 مرحبا こんにちは');
  });
});

describe('assignIssueToolSchema', () => {
  it('should validate issue assignment with assignee', () => {
    const input = {
      issueKey: 'ISSUE-123',
      assignee: 'john.doe',
    };
    const result = z.object(assignIssueToolSchema).parse(input);
    expect(result.issueKey).toBe('ISSUE-123');
    expect(result.assignee).toBe('john.doe');
  });

  it('should validate issue unassignment without assignee', () => {
    const input = {
      issueKey: 'ISSUE-456',
    };
    const result = z.object(assignIssueToolSchema).parse(input);
    expect(result.issueKey).toBe('ISSUE-456');
    expect(result.assignee).toBeUndefined();
  });

  it('should reject empty issue key', () => {
    expect(() =>
      z.object(assignIssueToolSchema).parse({
        issueKey: '',
        assignee: 'john.doe',
      })
    ).toThrow();
  });

  it('should reject missing issue key', () => {
    expect(() =>
      z.object(assignIssueToolSchema).parse({
        assignee: 'john.doe',
      })
    ).toThrow();
  });

  it('should allow empty string for assignee to unassign', () => {
    const input = {
      issueKey: 'ISSUE-789',
      assignee: '',
    };
    const result = z.object(assignIssueToolSchema).parse(input);
    expect(result.issueKey).toBe('ISSUE-789');
    expect(result.assignee).toBe('');
  });
});

describe('confirmIssueToolSchema', () => {
  it('should validate minimal parameters', () => {
    const input = {
      issue_key: 'ISSUE-123',
    };
    const result = z.object(confirmIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-123');
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_key: 'ISSUE-123',
      comment: 'Confirmed after code review',
    };
    const result = z.object(confirmIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-123');
    expect(result.comment).toBe('Confirmed after code review');
  });

  it('should reject missing issue key', () => {
    const input = {
      comment: 'Confirmed',
    };
    expect(() => z.object(confirmIssueToolSchema).parse(input)).toThrow();
  });
});

describe('unconfirmIssueToolSchema', () => {
  it('should validate minimal parameters', () => {
    const input = {
      issue_key: 'ISSUE-456',
    };
    const result = z.object(unconfirmIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-456');
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_key: 'ISSUE-456',
      comment: 'Needs further investigation',
    };
    const result = z.object(unconfirmIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-456');
    expect(result.comment).toBe('Needs further investigation');
  });

  it('should reject missing issue key', () => {
    const input = {
      comment: 'Unconfirmed',
    };
    expect(() => z.object(unconfirmIssueToolSchema).parse(input)).toThrow();
  });
});

describe('resolveIssueToolSchema', () => {
  it('should validate minimal parameters', () => {
    const input = {
      issue_key: 'ISSUE-789',
    };
    const result = z.object(resolveIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-789');
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_key: 'ISSUE-789',
      comment: 'Fixed in commit abc123',
    };
    const result = z.object(resolveIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-789');
    expect(result.comment).toBe('Fixed in commit abc123');
  });

  it('should reject missing issue key', () => {
    const input = {
      comment: 'Resolved',
    };
    expect(() => z.object(resolveIssueToolSchema).parse(input)).toThrow();
  });
});

describe('reopenIssueToolSchema', () => {
  it('should validate minimal parameters', () => {
    const input = {
      issue_key: 'ISSUE-101',
    };
    const result = z.object(reopenIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-101');
    expect(result.comment).toBeUndefined();
  });

  it('should validate parameters with comment', () => {
    const input = {
      issue_key: 'ISSUE-101',
      comment: 'Issue still occurs in production',
    };
    const result = z.object(reopenIssueToolSchema).parse(input);
    expect(result.issue_key).toBe('ISSUE-101');
    expect(result.comment).toBe('Issue still occurs in production');
  });

  it('should reject missing issue key', () => {
    const input = {
      comment: 'Reopened',
    };
    expect(() => z.object(reopenIssueToolSchema).parse(input)).toThrow();
  });
});
