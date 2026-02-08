/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`;
}

/**
 * Format an ISO timestamp to a localized date-time string.
 */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Truncate text to a maximum number of lines, with a note if truncated.
 */
export function truncateLines(text: string, maxLines: number): { text: string; truncated: boolean; totalLines: number } {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return { text, truncated: false, totalLines: lines.length };
  }
  return {
    text: lines.slice(0, maxLines).join('\n'),
    truncated: true,
    totalLines: lines.length,
  };
}

/**
 * Wrap content in a collapsible <details> block.
 */
export function details(summary: string, content: string, open = false): string {
  const openAttr = open ? ' open' : '';
  return `<details${openAttr}><summary>${summary}</summary>\n\n${content}\n\n</details>`;
}

/**
 * Relativize a file path against the project path.
 * If the file path starts with the project path, return the relative portion.
 */
export function relativizePath(filePath: string, projectPath: string): string {
  if (!projectPath) return filePath;
  // Ensure projectPath ends with separator for correct prefix matching
  const prefix = projectPath.endsWith('/') ? projectPath : projectPath + '/';
  if (filePath.startsWith(prefix)) {
    return filePath.slice(prefix.length);
  }
  if (filePath === projectPath) {
    return '.';
  }
  return filePath;
}

/**
 * Format a tool input for display. Extracts the most relevant parameter.
 * When projectPath is provided, file paths are relativized.
 */
export function formatToolInput(name: string, input: Record<string, unknown>, projectPath?: string): string {
  const formatPath = (p: unknown): string => {
    const s = String(p);
    return projectPath ? relativizePath(s, projectPath) : s;
  };

  // Show the most relevant parameter based on tool name
  switch (name) {
    case 'Read':
      return input.file_path ? `\`${formatPath(input.file_path)}\`` : '';
    case 'Write':
      return input.file_path ? `\`${formatPath(input.file_path)}\`` : '';
    case 'Edit':
      return input.file_path ? `\`${formatPath(input.file_path)}\`` : '';
    case 'Bash':
      return input.command ? `\`${String(input.command).substring(0, 100)}\`` : '';
    case 'Glob':
      return input.pattern ? `\`${input.pattern}\`` : '';
    case 'Grep':
      return input.pattern ? `\`${input.pattern}\`` : '';
    case 'Task':
      return input.description ? `"${input.description}"` : '';
    case 'WebFetch':
      return input.url ? `\`${input.url}\`` : '';
    case 'WebSearch':
      return input.query ? `"${input.query}"` : '';
    default:
      // Generic: show first string parameter
      for (const [, val] of Object.entries(input)) {
        if (typeof val === 'string' && val.length > 0) {
          return `\`${val.substring(0, 80)}\``;
        }
      }
      return '';
  }
}
