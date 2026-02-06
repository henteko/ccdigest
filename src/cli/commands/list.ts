import { listSessions } from '../../core/session-store.js';

export interface ListOptions {
  project?: string;
  json?: boolean;
  branch?: string;
}

export function runList(options: ListOptions): void {
  const projectPath = options.project || process.cwd();
  let sessions = listSessions(projectPath);

  if (options.branch) {
    sessions = sessions.filter((s) => s.branch === options.branch);
  }

  if (sessions.length === 0) {
    console.error('No sessions found.');
    process.exit(1);
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        sessions.map((s) => ({
          sessionId: s.sessionId,
          modifiedAt: s.modifiedAt.toISOString(),
          sizeBytes: s.sizeBytes,
          branch: s.branch,
        })),
        null,
        2
      )
    );
    return;
  }

  // Table format
  const maxIdLen = Math.max(...sessions.map((s) => s.sessionId.length), 10);
  const maxBranchLen = Math.max(...sessions.map((s) => s.branch.length), 6);

  console.log(
    `${'SESSION ID'.padEnd(maxIdLen)}  ${'BRANCH'.padEnd(maxBranchLen)}  ${'MODIFIED'.padEnd(19)}  ${'SIZE'.padStart(10)}`
  );
  console.log('-'.repeat(maxIdLen + 2 + maxBranchLen + 2 + 19 + 2 + 10));

  for (const s of sessions) {
    const date = s.modifiedAt.toISOString().replace('T', ' ').substring(0, 19);
    const size = formatBytes(s.sizeBytes);
    console.log(`${s.sessionId.padEnd(maxIdLen)}  ${s.branch.padEnd(maxBranchLen)}  ${date}  ${size.padStart(10)}`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
