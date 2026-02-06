import { findSession } from '../../core/session-store.js';
import { parseSession } from '../../core/parser.js';
import { formatSession } from '../../formatter/markdown.js';
import { resolveFormatOptions, type ShowOptions } from '../options.js';

export async function runShow(
  sessionId: string,
  options: ShowOptions & { project?: string }
): Promise<void> {
  const projectPath = options.project || process.cwd();

  try {
    const session = findSession(projectPath, sessionId);
    const parsed = await parseSession(session.filePath);
    const formatOpts = resolveFormatOptions(options);
    const markdown = formatSession(parsed, formatOpts);

    process.stdout.write(markdown);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
