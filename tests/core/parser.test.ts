import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readEvents, parseSession } from '../../src/core/parser.js';
import { encodeProjectPath } from '../../src/core/session-store.js';

const FIXTURE_DIR = path.join(import.meta.dirname, '..', 'fixtures');
const SIMPLE_SESSION = path.join(FIXTURE_DIR, 'simple-session.jsonl');

describe('readEvents', () => {
  it('reads all events from fixture file', async () => {
    const events = await readEvents(SIMPLE_SESSION);
    expect(events.length).toBe(11);
    expect(events[0].type).toBe('file-history-snapshot');
    expect(events[1].type).toBe('progress');
    expect(events[2].type).toBe('user');
    expect(events[3].type).toBe('assistant');
  });

  it('extracts correct event types', async () => {
    const events = await readEvents(SIMPLE_SESSION);
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'file-history-snapshot',
      'progress',
      'user',
      'assistant',
      'assistant',
      'assistant',
      'user',
      'assistant',
      'user',
      'assistant',
      'system',
    ]);
  });
});

describe('parseSession', () => {
  it('extracts session metadata', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    expect(session.metadata.sessionId).toBe('test-session-001');
    expect(session.metadata.project).toBe('/Users/test/project');
    expect(session.metadata.branch).toBe('main');
    expect(session.metadata.claudeVersion).toBe('2.1.34');
    expect(session.metadata.model).toBe('claude-opus-4-6');
  });

  it('builds correct number of turns', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    expect(session.turns.length).toBe(2);
  });

  it('parses first turn correctly', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const turn1 = session.turns[0];

    expect(turn1.turnNumber).toBe(1);
    expect(turn1.userMessage).toBe('Hello, please read the README file.');

    // Should have 2 assistant messages (msg-asst-001 and msg-asst-002)
    expect(turn1.assistantMessages.length).toBe(2);

    // First message: has thinking, text, and tool use
    const msg1 = turn1.assistantMessages[0];
    expect(msg1.messageId).toBe('msg-asst-001');
    expect(msg1.thinkingBlocks.length).toBe(1);
    expect(msg1.thinkingBlocks[0]).toContain('user wants me to read');
    expect(msg1.textBlocks.length).toBe(1);
    expect(msg1.textBlocks[0]).toContain("I'll read the README");
    expect(msg1.toolCalls.length).toBe(1);
    expect(msg1.toolCalls[0].name).toBe('Read');
    expect(msg1.toolCalls[0].input).toEqual({
      file_path: '/Users/test/project/README.md',
    });
    expect(msg1.toolCalls[0].result).toContain('# My Project');

    // Second message: just text response
    const msg2 = turn1.assistantMessages[1];
    expect(msg2.messageId).toBe('msg-asst-002');
    expect(msg2.textBlocks.length).toBe(1);
    expect(msg2.textBlocks[0]).toContain("Here's the README content");
    expect(msg2.toolCalls.length).toBe(0);
  });

  it('parses second turn correctly', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    const turn2 = session.turns[1];

    expect(turn2.turnNumber).toBe(2);
    expect(turn2.userMessage).toBe('Now add a Feature 3 to the README.');
    expect(turn2.assistantMessages.length).toBe(1);
    expect(turn2.assistantMessages[0].textBlocks[0]).toContain("I've added Feature 3");
  });

  it('captures turn duration from system events', async () => {
    const session = await parseSession(SIMPLE_SESSION);
    // The system event with turn_duration comes after turn 2
    expect(session.turns[1].durationMs).toBe(60000);
  });
});

describe.skipIf(!process.env.CCDIGEST_INTEGRATION)('parseSession with real data', () => {
  it('parses real session file without errors', async () => {
    const realSessionDir = path.join(
      process.env.HOME!,
      '.claude',
      'projects',
      encodeProjectPath(process.cwd())
    );
    const fs = await import('node:fs');
    const entries = fs.readdirSync(realSessionDir).filter((f: string) => f.endsWith('.jsonl'));
    if (entries.length === 0) return;

    // Parse the smallest session
    const smallest = entries[0];
    const session = await parseSession(path.join(realSessionDir, smallest));

    expect(session.metadata.sessionId).toBeTruthy();
    expect(session.metadata.project).toBeTruthy();
    expect(session.turns.length).toBeGreaterThanOrEqual(0);
  });
});
