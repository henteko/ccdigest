import { findSession, listSessions } from '../../core/session-store.js';
import { parseSession } from '../../core/parser.js';
import { mergeSessions } from '../../core/merger.js';
import { formatSession } from '../../formatter/markdown.js';
import { resolveFormatOptions, type ShowOptions } from '../options.js';

export async function runShow(
  sessionIds: string[],
  options: ShowOptions & { project?: string; branch?: string }
): Promise<void> {
  const projectPath = options.project || process.cwd();

  try {
    let resolvedIds = sessionIds;

    if (options.branch) {
      const sessions = listSessions(projectPath)
        .filter((s) => s.branch === options.branch);

      if (sessions.length === 0) {
        throw new Error(`No sessions found for branch "${options.branch}"`);
      }

      resolvedIds = [...resolvedIds, ...sessions.map((s) => s.sessionId)];
    }

    if (resolvedIds.length === 0) {
      throw new Error('Specify at least one session ID or use --branch <name>');
    }

    const parsedSessions = await Promise.all(
      resolvedIds.map(async (id) => {
        const session = findSession(projectPath, id);
        return parseSession(session.filePath);
      })
    );

    const merged = parsedSessions.length > 1
      ? mergeSessions(parsedSessions)
      : parsedSessions[0];

    const formatOpts = resolveFormatOptions(options);
    const markdown = formatSession(merged, formatOpts);

    process.stdout.write(markdown);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
