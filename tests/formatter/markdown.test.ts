import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseSession } from '../../src/core/parser.js';
import { formatSession } from '../../src/formatter/markdown.js';
import {
  formatDuration,
  formatTimestamp,
  truncateLines,
  details,
  formatToolInput,
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

describe('formatToolInput', () => {
  it('formats Read tool input', () => {
    expect(formatToolInput('Read', { file_path: '/foo/bar.ts' })).toBe('`/foo/bar.ts`');
  });

  it('formats Bash tool input', () => {
    expect(formatToolInput('Bash', { command: 'npm test' })).toBe('`npm test`');
  });

  it('formats Task tool input', () => {
    expect(formatToolInput('Task', { description: 'explore code' })).toBe('"explore code"');
  });
});

// --- Full formatter ---

describe('formatSession', () => {
  it('formats simple session to markdown', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session);

    // Header
    expect(md).toContain('# Session Report');
    expect(md).toContain('**Session ID**: `test-session-001`');
    expect(md).toContain('**Project**: `/Users/test/project`');
    expect(md).toContain('**Branch**: `main`');
    expect(md).toContain('**Model**: `claude-opus-4-6`');
    expect(md).toContain('**Turns**: 2');

    // Turn 1
    expect(md).toContain('## Turn 1');
    expect(md).toContain('> Hello, please read the README file.');
    expect(md).toContain('### Assistant');
    expect(md).toContain('<summary>Thinking</summary>');
    expect(md).toContain('user wants me to read');
    expect(md).toContain("I'll read the README for you.");
    expect(md).toContain('**Tool: Read** (`/Users/test/project/README.md`)');
    expect(md).toContain('<summary>Result');

    // Turn 2
    expect(md).toContain('## Turn 2');
    expect(md).toContain('> Now add a Feature 3 to the README.');
    expect(md).toContain("I've added Feature 3");
  });

  it('hides thinking with hidden option', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { showThinking: 'hidden' });

    expect(md).not.toContain('<summary>Thinking</summary>');
    expect(md).not.toContain('user wants me to read');
  });

  it('expands thinking with expanded option', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { showThinking: 'expanded' });

    expect(md).toContain('<details open><summary>Thinking</summary>');
  });

  it('hides tools with showTools=false', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { showTools: false });

    expect(md).not.toContain('**Tool: Read**');
  });

  it('respects maxToolLines option', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const md = formatSession(session, { maxToolLines: 3 });

    // The tool result has 7 lines, should be truncated to 3
    expect(md).toContain('showing first 3');
  });
});
