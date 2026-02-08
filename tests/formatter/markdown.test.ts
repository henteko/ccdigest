import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseSession } from '../../src/core/parser.js';
import { formatSession } from '../../src/formatter/markdown.js';
import {
  formatDuration,
  formatTimestamp,
  truncateLines,
  details,
  fencedCodeBlock,
  inlineCode,
  escapeDetailsContent,
  formatToolInput,
  relativizePath,
} from '../../src/formatter/templates.js';

const FIXTURE_DIR = path.join(import.meta.dirname, '..', 'fixtures');
const SIMPLE_SESSION = path.join(FIXTURE_DIR, 'simple-session.jsonl');

// --- Template helpers ---

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5秒');
    expect(formatDuration(45000)).toBe('45秒');
  });

  it('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1分');
    expect(formatDuration(90000)).toBe('1分30秒');
    expect(formatDuration(300000)).toBe('5分');
  });

  it('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1時間');
    expect(formatDuration(5400000)).toBe('1時間30分');
  });
});

describe('formatTimestamp', () => {
  it('formats ISO timestamp', () => {
    // Note: this test depends on the local timezone
    const result = formatTimestamp('2026-02-06T09:44:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe('truncateLines', () => {
  it('does not truncate short text', () => {
    const result = truncateLines('line1\nline2\nline3', 5);
    expect(result.truncated).toBe(false);
    expect(result.totalLines).toBe(3);
  });

  it('truncates long text', () => {
    const text = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
    const result = truncateLines(text, 10);
    expect(result.truncated).toBe(true);
    expect(result.totalLines).toBe(100);
    expect(result.text.split('\n').length).toBe(10);
  });
});

describe('details', () => {
  it('creates collapsed details block', () => {
    const result = details('Summary', 'Content');
    expect(result).toContain('<details>');
    expect(result).toContain('<summary>Summary</summary>');
    expect(result).toContain('Content');
  });

  it('creates open details block', () => {
    const result = details('Summary', 'Content', true);
    expect(result).toContain('<details open>');
  });
});

describe('fencedCodeBlock', () => {
  it('uses triple backticks by default', () => {
    const result = fencedCodeBlock('console.log("hello")');
    expect(result).toBe('```\nconsole.log("hello")\n```');
  });

  it('adds language identifier', () => {
    const result = fencedCodeBlock('const x = 1', 'ts');
    expect(result).toBe('```ts\nconst x = 1\n```');
  });

  it('uses longer fence when content contains triple backticks', () => {
    const content = 'some code\n```\ninner block\n```\nmore code';
    const result = fencedCodeBlock(content);
    expect(result).toMatch(/^````\n/);
    expect(result).toMatch(/\n````$/);
  });

  it('uses even longer fence for nested fences', () => {
    const content = '````\ndeep\n````';
    const result = fencedCodeBlock(content);
    expect(result).toMatch(/^`````\n/);
    expect(result).toMatch(/\n`````$/);
  });
});

describe('inlineCode', () => {
  it('uses single backtick for simple text', () => {
    expect(inlineCode('foo')).toBe('`foo`');
  });

  it('uses double backticks when content contains a backtick', () => {
    expect(inlineCode('echo `date`')).toBe('`` echo `date` ``');
  });

  it('adds spaces when content starts with backtick', () => {
    expect(inlineCode('`start')).toBe('`` `start ``');
  });

  it('adds spaces when content ends with backtick', () => {
    expect(inlineCode('end`')).toBe('`` end` ``');
  });
});

describe('escapeDetailsContent', () => {
  it('escapes </details> tag', () => {
    const result = escapeDetailsContent('text </details> more');
    expect(result).toBe('text &lt;/details> more');
    expect(result).not.toContain('</details>');
  });

  it('escapes </summary> tag', () => {
    const result = escapeDetailsContent('text </summary> more');
    expect(result).toBe('text &lt;/summary> more');
  });

  it('is case insensitive', () => {
    const result = escapeDetailsContent('</Details> </SUMMARY>');
    expect(result).not.toContain('</Details>');
    expect(result).not.toContain('</SUMMARY>');
  });

  it('leaves other HTML tags alone', () => {
    const result = escapeDetailsContent('<div>hello</div>');
    expect(result).toBe('<div>hello</div>');
  });
});

describe('relativizePath', () => {
  it('relativizes a path under the project', () => {
    expect(relativizePath('/Users/test/project/src/main.ts', '/Users/test/project'))
      .toBe('src/main.ts');
  });

  it('returns the path as-is if not under the project', () => {
    expect(relativizePath('/other/path/file.ts', '/Users/test/project'))
      .toBe('/other/path/file.ts');
  });

  it('handles project path with trailing slash', () => {
    expect(relativizePath('/Users/test/project/README.md', '/Users/test/project/'))
      .toBe('README.md');
  });

  it('returns . for exact project path match', () => {
    expect(relativizePath('/Users/test/project', '/Users/test/project'))
      .toBe('.');
  });

  it('returns original path when projectPath is empty', () => {
    expect(relativizePath('/Users/test/project/file.ts', ''))
      .toBe('/Users/test/project/file.ts');
  });
});

describe('formatToolInput', () => {
  it('formats Read tool input with full path', () => {
    expect(formatToolInput('Read', { file_path: '/foo/bar.ts' })).toBe('`/foo/bar.ts`');
  });

  it('formats Read tool input with relativized path', () => {
    expect(formatToolInput('Read', { file_path: '/foo/bar.ts' }, '/foo')).toBe('`bar.ts`');
  });

  it('formats Bash tool input', () => {
    expect(formatToolInput('Bash', { command: 'npm test' })).toBe('`npm test`');
  });

  it('formats Bash tool input with backticks safely', () => {
    expect(formatToolInput('Bash', { command: 'echo `date`' })).toBe('`` echo `date` ``');
  });

  it('formats Task tool input', () => {
    expect(formatToolInput('Task', { description: 'explore code' })).toBe('"explore code"');
  });
});

// --- Full formatter ---

describe('formatSession (default filter mode)', () => {
  it('shows project basename only', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { projectPath: '/Users/test/project' });

    expect(md).toContain('**Project**: `project`');
    expect(md).not.toContain('**Project**: `/Users/test/project`');
  });

  it('hides thinking blocks', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { projectPath: '/Users/test/project' });

    expect(md).not.toContain('<summary>Thinking</summary>');
    expect(md).not.toContain('user wants me to read');
  });

  it('shows tool names with relativized paths', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { projectPath: '/Users/test/project' });

    expect(md).toContain('**Tool: Read** (`README.md`)');
  });

  it('hides tool results', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { projectPath: '/Users/test/project' });

    expect(md).not.toContain('<summary>Result');
    expect(md).not.toContain('This is a test project');
  });

  it('shows user and assistant messages', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { projectPath: '/Users/test/project' });

    expect(md).toContain('> Hello, please read the README file.');
    expect(md).toContain("I'll read the README for you.");
    expect(md).toContain("I've added Feature 3");
  });

  it('shows header info', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { projectPath: '/Users/test/project' });

    expect(md).toContain('# Session Report');
    expect(md).toContain('**Session ID**: `test-session-001`');
    expect(md).toContain('**Branch**: `main`');
    expect(md).toContain('**Model**: `claude-opus-4-6`');
    expect(md).toContain('**Turns**: 2');
  });
});

describe('formatSession (no-filter mode)', () => {
  it('shows full project path', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { noFilter: true, projectPath: '/Users/test/project' });

    expect(md).toContain('**Project**: `/Users/test/project`');
  });

  it('shows thinking blocks collapsed', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { noFilter: true, projectPath: '/Users/test/project' });

    expect(md).toContain('<details><summary>Thinking</summary>');
    expect(md).toContain('user wants me to read');
  });

  it('shows tool names with full paths', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { noFilter: true, projectPath: '/Users/test/project' });

    expect(md).toContain('**Tool: Read** (`/Users/test/project/README.md`)');
  });

  it('shows tool results', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { noFilter: true, projectPath: '/Users/test/project' });

    expect(md).toContain('<summary>Result');
    expect(md).toContain('This is a test project');
  });
});
