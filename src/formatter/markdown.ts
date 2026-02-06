import type {
  ParsedSession,
  ConversationTurn,
  AssistantMessage,
  ToolCall,
  FormatOptions,
} from '../core/types.js';
import {
  formatDuration,
  formatTimestamp,
  truncateLines,
  details,
  formatToolInput,
} from './templates.js';

const DEFAULT_OPTIONS: FormatOptions = {
  showThinking: 'collapsed',
  showTools: true,
  maxToolLines: 50,
};

/**
 * Format a parsed session into Markdown.
 */
export function formatSession(
  session: ParsedSession,
  options: Partial<FormatOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts: string[] = [];

  parts.push(renderHeader(session));

  for (const turn of session.turns) {
    parts.push(renderTurn(turn, opts));
  }

  return parts.join('\n\n---\n\n') + '\n';
}

function renderHeader(session: ParsedSession): string {
  const { metadata } = session;
  const lines: string[] = [];
  const isMerged = metadata.sessionId.includes(',');

  if (isMerged) {
    lines.push('# Merged Session Report');
    lines.push('');
    const ids = metadata.sessionId.split(',');
    lines.push(`- **Sessions** (${ids.length}):`);
    for (const id of ids) {
      lines.push(`  - \`${id}\``);
    }
  } else {
    lines.push('# Session Report');
    lines.push('');
    lines.push(`- **Session ID**: \`${metadata.sessionId}\``);
  }
  lines.push(`- **Project**: \`${metadata.project}\``);

  if (metadata.branch) {
    lines.push(`- **Branch**: \`${metadata.branch}\``);
  }

  if (metadata.model) {
    lines.push(`- **Model**: \`${metadata.model}\``);
  }

  if (metadata.startTime && metadata.endTime) {
    const start = formatTimestamp(metadata.startTime);
    const end = formatTimestamp(metadata.endTime);
    const durationMs =
      new Date(metadata.endTime).getTime() - new Date(metadata.startTime).getTime();
    const duration = formatDuration(durationMs);

    if (start === end) {
      lines.push(`- **Date**: ${start}`);
    } else {
      lines.push(`- **Date**: ${start} - ${end} (${duration})`);
    }
  }

  if (session.turns.length > 0) {
    lines.push(`- **Turns**: ${session.turns.length}`);
  }

  return lines.join('\n');
}

function renderTurn(turn: ConversationTurn, opts: FormatOptions): string {
  const parts: string[] = [];

  // Turn header
  let turnHeader = `## Turn ${turn.turnNumber}`;
  if (turn.durationMs) {
    turnHeader += ` (${formatDuration(turn.durationMs)})`;
  }
  parts.push(turnHeader);

  // User message
  parts.push('### User');
  parts.push(
    turn.userMessage
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
  );

  // Assistant messages
  for (const msg of turn.assistantMessages) {
    parts.push(renderAssistantMessage(msg, opts));
  }

  return parts.join('\n\n');
}

function renderAssistantMessage(
  msg: AssistantMessage,
  opts: FormatOptions
): string {
  const parts: string[] = [];

  parts.push('### Assistant');

  // Thinking blocks
  if (opts.showThinking !== 'hidden' && msg.thinkingBlocks.length > 0) {
    const thinking = msg.thinkingBlocks.join('\n\n');
    if (opts.showThinking === 'expanded') {
      parts.push(details('Thinking', thinking, true));
    } else {
      parts.push(details('Thinking', thinking, false));
    }
  }

  // Text blocks
  for (const text of msg.textBlocks) {
    parts.push(text);
  }

  // Tool calls
  if (opts.showTools) {
    for (const tc of msg.toolCalls) {
      parts.push(renderToolCall(tc, opts));
    }
  }

  return parts.join('\n\n');
}

function renderToolCall(tc: ToolCall, opts: FormatOptions): string {
  const inputDisplay = formatToolInput(tc.name, tc.input);
  const header = inputDisplay
    ? `**Tool: ${tc.name}** (${inputDisplay})`
    : `**Tool: ${tc.name}**`;

  if (!tc.result) {
    return header;
  }

  const { text, truncated, totalLines } = truncateLines(tc.result, opts.maxToolLines);
  const summaryExtra = truncated
    ? ` (${totalLines} lines, showing first ${opts.maxToolLines})`
    : ` (${totalLines} lines)`;

  return `${header}\n\n${details(`Result${summaryExtra}`, '```\n' + text + (truncated ? '\n...' : '') + '\n```', false)}`;
}
