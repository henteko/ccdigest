import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface SessionInfo {
  sessionId: string;
  filePath: string;
  modifiedAt: Date;
  sizeBytes: number;
  branch: string;
}

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * Encode a filesystem path to the directory name format used by Claude Code.
 * e.g. "/Users/alice/dev/myproject" → "-Users-alice-dev-myproject"
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Decode a Claude Code project directory name back to a filesystem path.
 * e.g. "-Users-alice-dev-myproject" → "/Users/alice/dev/myproject"
 */
export function decodeProjectPath(encoded: string): string {
  // The encoded string starts with '-' which represents the leading '/'
  // Then each '-' represents a '/'
  return encoded.replace(/-/g, '/');
}

/**
 * Get the Claude Code project data directory for a given project path.
 */
export function getProjectDir(projectPath: string): string {
  const encoded = encodeProjectPath(projectPath);
  return path.join(CLAUDE_PROJECTS_DIR, encoded);
}

/**
 * Extract the git branch from a JSONL session file by reading the first few lines.
 * Returns an empty string if no gitBranch is found.
 */
export function extractBranch(filePath: string): string {
  const MAX_BYTES = 4096;
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(MAX_BYTES);
    const bytesRead = fs.readSync(fd, buf, 0, MAX_BYTES, 0);
    const chunk = buf.toString('utf8', 0, bytesRead);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.gitBranch) {
          return event.gitBranch;
        }
      } catch {
        // skip malformed lines
      }
    }
  } finally {
    fs.closeSync(fd);
  }
  return '';
}

/**
 * List all session JSONL files for a project, sorted by modification time (newest first).
 */
export function listSessions(projectPath: string): SessionInfo[] {
  const projectDir = getProjectDir(projectPath);

  if (!fs.existsSync(projectDir)) {
    return [];
  }

  const entries = fs.readdirSync(projectDir, { withFileTypes: true });
  const sessions: SessionInfo[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
      continue;
    }

    const filePath = path.join(projectDir, entry.name);
    const stat = fs.statSync(filePath);
    const sessionId = entry.name.replace('.jsonl', '');

    sessions.push({
      sessionId,
      filePath,
      modifiedAt: stat.mtime,
      sizeBytes: stat.size,
      branch: extractBranch(filePath),
    });
  }

  // Sort newest first
  sessions.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

  return sessions;
}

/**
 * Find a session by exact ID or prefix match.
 * Returns the matching session, or throws if no match or ambiguous.
 */
export function findSession(
  projectPath: string,
  idOrPrefix: string
): SessionInfo {
  const sessions = listSessions(projectPath);
  const matches = sessions.filter((s) => s.sessionId.startsWith(idOrPrefix));

  if (matches.length === 0) {
    throw new Error(`No session found matching "${idOrPrefix}"`);
  }

  if (matches.length > 1) {
    const ids = matches.map((s) => s.sessionId).join('\n  ');
    throw new Error(
      `Ambiguous session prefix "${idOrPrefix}". Matches:\n  ${ids}`
    );
  }

  return matches[0];
}
