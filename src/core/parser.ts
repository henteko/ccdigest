import fs from 'node:fs';
import readline from 'node:readline';
import type {
  SessionEvent,
  UserEvent,
  AssistantEvent,
  SystemEvent,
  ParsedSession,
  SessionMetadata,
  ConversationTurn,
  AssistantMessage,
  ToolCall,
  ContentBlock,
  ToolResultBlock,
} from './types.js';

/**
 * Read all events from a JSONL file.
 */
export async function readEvents(filePath: string): Promise<SessionEvent[]> {
  const events: SessionEvent[] = [];
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as SessionEvent);
    } catch {
      // Skip malformed lines
    }
  }

  return events;
}

/**
 * Extract session metadata from the events.
 */
function extractMetadata(events: SessionEvent[]): SessionMetadata {
  let sessionId = '';
  let project = '';
  let branch = '';
  let version = '';
  let model = '';
  let startTime = '';
  let endTime = '';

  for (const event of events) {
    if ('sessionId' in event && event.sessionId) {
      sessionId = event.sessionId;
    }
    if ('cwd' in event && event.cwd) {
      project = event.cwd;
    }
    if ('gitBranch' in event && event.gitBranch) {
      branch = event.gitBranch;
    }
    if ('version' in event && event.version) {
      version = event.version as string;
    }
    if (event.type === 'assistant') {
      const ae = event as AssistantEvent;
      if (ae.message?.model) {
        model = ae.message.model;
      }
    }

    // Track time range
    const ts = 'timestamp' in event ? (event as { timestamp: string }).timestamp : undefined;
    if (ts) {
      if (!startTime || ts < startTime) startTime = ts;
      if (!endTime || ts > endTime) endTime = ts;
    }
  }

  return { sessionId, project, branch, claudeVersion: version, startTime, endTime, model };
}

/**
 * Extract text from a tool result content (string or array).
 */
function extractToolResultText(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text!)
      .join('\n');
  }
  return '';
}

/**
 * Parse events into a structured session with conversation turns.
 */
export async function parseSession(filePath: string): Promise<ParsedSession> {
  const events = await readEvents(filePath);
  const metadata = extractMetadata(events);

  const turns: ConversationTurn[] = [];
  let currentTurn: ConversationTurn | null = null;

  // Accumulate assistant message fragments by message.id
  // Each streaming chunk for the same message.id gets merged
  const pendingAssistantChunks = new Map<
    string,
    { model: string; thinkingBlocks: string[]; textBlocks: string[]; toolCalls: ToolCall[] }
  >();

  // Map tool_use id -> ToolCall for filling in results later
  const toolCallMap = new Map<string, ToolCall>();

  function flushAssistantMessages(): AssistantMessage[] {
    const messages: AssistantMessage[] = [];
    for (const [messageId, data] of pendingAssistantChunks) {
      messages.push({
        messageId,
        model: data.model,
        thinkingBlocks: data.thinkingBlocks,
        textBlocks: data.textBlocks,
        toolCalls: data.toolCalls,
      });
    }
    pendingAssistantChunks.clear();
    return messages;
  }

  for (const event of events) {
    if (event.type === 'user') {
      const ue = event as UserEvent;
      const content = ue.message.content;

      if (typeof content === 'string') {
        // New user prompt → new turn
        if (currentTurn) {
          currentTurn.assistantMessages = flushAssistantMessages();
          turns.push(currentTurn);
        }
        currentTurn = {
          turnNumber: turns.length + 1,
          userMessage: content,
          assistantMessages: [],
          timestamp: ue.timestamp,
        };
      } else if (Array.isArray(content)) {
        // tool_result → same turn, fill in tool results
        for (const block of content) {
          if (block.type === 'tool_result') {
            const tr = block as ToolResultBlock;
            const tc = toolCallMap.get(tr.tool_use_id);
            if (tc) {
              tc.result = extractToolResultText(tr.content);
            }
          }
        }
      }
    } else if (event.type === 'assistant') {
      const ae = event as AssistantEvent;
      const msgId = ae.message.id;
      if (!msgId) continue;

      let accumulated = pendingAssistantChunks.get(msgId);
      if (!accumulated) {
        accumulated = {
          model: ae.message.model,
          thinkingBlocks: [],
          textBlocks: [],
          toolCalls: [],
        };
        pendingAssistantChunks.set(msgId, accumulated);
      }

      for (const block of ae.message.content) {
        switch (block.type) {
          case 'thinking':
            if (block.thinking) {
              accumulated.thinkingBlocks.push(block.thinking);
            }
            break;
          case 'text':
            if (block.text && block.text.trim()) {
              accumulated.textBlocks.push(block.text);
            }
            break;
          case 'tool_use': {
            const tc: ToolCall = {
              name: block.name,
              input: block.input,
              result: '',
            };
            accumulated.toolCalls.push(tc);
            toolCallMap.set(block.id, tc);
            break;
          }
        }
      }
    } else if (event.type === 'system') {
      const se = event as SystemEvent;
      if (se.subtype === 'turn_duration' && se.durationMs && currentTurn) {
        currentTurn.durationMs = se.durationMs;
      }
    }
    // Skip progress and file-history-snapshot events
  }

  // Flush the last turn
  if (currentTurn) {
    currentTurn.assistantMessages = flushAssistantMessages();
    turns.push(currentTurn);
  }

  return { metadata, turns };
}
