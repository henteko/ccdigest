import fs from 'node:fs';
import { findSession } from '../../core/session-store.js';
import { parseSession } from '../../core/parser.js';
import { mergeSessions } from '../../core/merger.js';
import { formatSession } from '../../formatter/markdown.js';
import { resolveFormatOptions, type ShowOptions } from '../options.js';

export async function runExport(
  sessionIds: string[],
  options: ShowOptions & { project?: string; output: string }
): Promise<void> {
  const projectPath = options.project || process.cwd();

  try {
    const parsedSessions = await Promise.all(
      sessionIds.map(async (id) => {
        const session = findSession(projectPath, id);
        return parseSession(session.filePath);
      })
    );

    const merged = parsedSessions.length > 1
      ? mergeSessions(parsedSessions)
      : parsedSessions[0];

    const formatOpts = resolveFormatOptions(options);
    const markdown = formatSession(merged, formatOpts);

    fs.writeFileSync(options.output, markdown, 'utf-8');
    console.error(`Exported to ${options.output}`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
