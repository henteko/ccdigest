import { describe, it, expect } from 'vitest';
import { mergeSessions } from '../../src/core/merger.js';
import type { ParsedSession } from '../../src/core/types.js';

function makeSession(overrides: Partial<ParsedSession['metadata']> & { turns?: ParsedSession['turns'] }): ParsedSession {
  const { turns = [], ...metaOverrides } = overrides;
  return {
    metadata: {
      sessionId: 'session-1',
      project: '/test/project',
      branch: 'main',
      claudeVersion: '2.1.34',
      startTime: '2025-01-01T00:00:00Z',
      endTime: '2025-01-01T01:00:00Z',
      model: 'claude-opus-4-6',
      ...metaOverrides,
    },
    turns,
  };
}

describe('mergeSessions', () => {
  it('returns single session as-is', () => {
    const session = makeSession({
      turns: [
        { turnNumber: 1, userMessage: 'hello', assistantMessages: [], timestamp: '2025-01-01T00:00:00Z' },
      ],
    });
    const result = mergeSessions([session]);
    expect(result).toBe(session);
  });

  it('throws on empty array', () => {
    expect(() => mergeSessions([])).toThrow('At least one session is required');
  });

  it('merges turns from two sessions in chronological order', () => {
    const session1 = makeSession({
      sessionId: 'aaa',
      startTime: '2025-01-01T00:00:00Z',
      endTime: '2025-01-01T00:10:00Z',
      turns: [
        { turnNumber: 1, userMessage: 'first-s1', assistantMessages: [], timestamp: '2025-01-01T00:00:00Z' },
        { turnNumber: 2, userMessage: 'third-s1', assistantMessages: [], timestamp: '2025-01-01T00:10:00Z' },
      ],
    });
    const session2 = makeSession({
      sessionId: 'bbb',
      startTime: '2025-01-01T00:05:00Z',
      endTime: '2025-01-01T00:15:00Z',
      turns: [
        { turnNumber: 1, userMessage: 'second-s2', assistantMessages: [], timestamp: '2025-01-01T00:05:00Z' },
        { turnNumber: 2, userMessage: 'fourth-s2', assistantMessages: [], timestamp: '2025-01-01T00:15:00Z' },
      ],
    });

    const result = mergeSessions([session1, session2]);

    // Turns should be interleaved by timestamp
    expect(result.turns.map((t) => t.userMessage)).toEqual([
      'first-s1',
      'second-s2',
      'third-s1',
      'fourth-s2',
    ]);
  });

  it('re-numbers turns starting from 1', () => {
    const session1 = makeSession({
      sessionId: 'aaa',
      turns: [
        { turnNumber: 1, userMessage: 'a', assistantMessages: [], timestamp: '2025-01-01T00:00:00Z' },
      ],
    });
    const session2 = makeSession({
      sessionId: 'bbb',
      turns: [
        { turnNumber: 1, userMessage: 'b', assistantMessages: [], timestamp: '2025-01-01T00:05:00Z' },
      ],
    });

    const result = mergeSessions([session1, session2]);
    expect(result.turns.map((t) => t.turnNumber)).toEqual([1, 2]);
  });

  it('merges metadata correctly', () => {
    const session1 = makeSession({
      sessionId: 'aaa',
      project: '/project/one',
      branch: 'feature-a',
      model: 'model-a',
      startTime: '2025-01-01T00:00:00Z',
      endTime: '2025-01-01T01:00:00Z',
    });
    const session2 = makeSession({
      sessionId: 'bbb',
      project: '/project/two',
      branch: 'feature-b',
      model: 'model-b',
      startTime: '2024-12-31T23:00:00Z',
      endTime: '2025-01-01T02:00:00Z',
    });

    const result = mergeSessions([session1, session2]);

    expect(result.metadata.sessionId).toBe('aaa,bbb');
    // Uses first session's values
    expect(result.metadata.project).toBe('/project/one');
    expect(result.metadata.branch).toBe('feature-a');
    expect(result.metadata.model).toBe('model-a');
    // Uses min/max times
    expect(result.metadata.startTime).toBe('2024-12-31T23:00:00Z');
    expect(result.metadata.endTime).toBe('2025-01-01T02:00:00Z');
  });

  it('places turns without timestamp at the end', () => {
    const session1 = makeSession({
      sessionId: 'aaa',
      turns: [
        { turnNumber: 1, userMessage: 'with-ts', assistantMessages: [], timestamp: '2025-01-01T00:00:00Z' },
      ],
    });
    const session2 = makeSession({
      sessionId: 'bbb',
      turns: [
        { turnNumber: 1, userMessage: 'no-ts', assistantMessages: [] },
      ],
    });

    const result = mergeSessions([session1, session2]);
    expect(result.turns.map((t) => t.userMessage)).toEqual(['with-ts', 'no-ts']);
  });
});
