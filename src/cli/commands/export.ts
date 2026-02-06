import fs from 'node:fs';
import { findSession } from '../../core/session-store.js';
import { parseSession } from '../../core/parser.js';
import { formatSession } from '../../formatter/markdown.js';
import { resolveFormatOptions, type ShowOptions } from '../options.js';

export async function runExport(
  sessionId: string,
  options: ShowOptions & { project?: string; output: string }
): Promise<void> {
  const projectPath = options.project || process.cwd();

  try {
    const session = findSession(projectPath, sessionId);
    const parsed = await parseSession(session.filePath);
    const formatOpts = resolveFormatOptions(options);
    const markdown = formatSession(parsed, formatOpts);

    fs.writeFileSync(options.output, markdown, 'utf-8');
    console.error(`Exported to ${options.output}`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
