import type { ParsedSession } from './types.js';

/**
 * Merge multiple parsed sessions into a single session with turns sorted by timestamp.
 * If only one session is provided, it is returned as-is.
 */
export function mergeSessions(sessions: ParsedSession[]): ParsedSession {
  if (sessions.length === 0) {
    throw new Error('At least one session is required');
  }
  if (sessions.length === 1) {
    return sessions[0];
  }

  // Collect all turns from all sessions
  const allTurns = sessions.flatMap((s) => s.turns);

  // Sort by timestamp (turns without timestamp go to the end)
  allTurns.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return a.timestamp.localeCompare(b.timestamp);
  });

  // Re-number turns
  for (let i = 0; i < allTurns.length; i++) {
    allTurns[i].turnNumber = i + 1;
  }

  // Merge metadata
  const first = sessions[0].metadata;
  const sessionId = sessions.map((s) => s.metadata.sessionId).join(',');

  let startTime = first.startTime;
  let endTime = first.endTime;
  for (const s of sessions) {
    const m = s.metadata;
    if (m.startTime && (!startTime || m.startTime < startTime)) {
      startTime = m.startTime;
    }
    if (m.endTime && (!endTime || m.endTime > endTime)) {
      endTime = m.endTime;
    }
  }

  return {
    metadata: {
      sessionId,
      project: first.project,
      branch: first.branch,
      claudeVersion: first.claudeVersion,
      startTime,
      endTime,
      model: first.model,
    },
    turns: allTurns,
  };
}
