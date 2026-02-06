// ============================================================
// Raw JSONL Event Types (as stored by Claude Code)
// ============================================================

/** Common fields present on most JSONL events */
export interface BaseEvent {
  type: string;
  uuid: string;
  timestamp: string;
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
}

// --- Content block types within messages ---

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ToolResultContentItem[];
}

export interface ToolResultContentItem {
  type: 'text' | 'image';
  text?: string;
  source?: unknown;
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

// --- Event types ---

export interface UserEvent extends BaseEvent {
  type: 'user';
  message: {
    role: 'user';
    content: string | ContentBlock[];
  };
}

export interface AssistantEvent extends BaseEvent {
  type: 'assistant';
  message: {
    role: 'assistant';
    id: string;
    model: string;
    stop_reason: string | null;
    content: ContentBlock[];
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  requestId?: string;
}

export interface ProgressEvent extends BaseEvent {
  type: 'progress';
  data: {
    type: string;
    [key: string]: unknown;
  };
  toolUseID: string;
  parentToolUseID: string;
}

export interface SystemEvent extends BaseEvent {
  type: 'system';
  subtype: string;
  durationMs?: number;
  hookCount?: number;
  hookInfos?: Array<{ command: string }>;
  hookErrors?: unknown[];
  stopReason?: string;
  level?: string;
  [key: string]: unknown;
}

export interface FileHistorySnapshotEvent {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

export type SessionEvent =
  | UserEvent
  | AssistantEvent
  | ProgressEvent
  | SystemEvent
  | FileHistorySnapshotEvent;

// ============================================================
// Parsed / Structured Types
// ============================================================

export interface SessionMetadata {
  sessionId: string;
  project: string;
  branch: string;
  claudeVersion: string;
  startTime: string;
  endTime: string;
  model: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result: string;
}

export interface AssistantMessage {
  messageId: string;
  model: string;
  thinkingBlocks: string[];
  textBlocks: string[];
  toolCalls: ToolCall[];
}

export interface ConversationTurn {
  turnNumber: number;
  userMessage: string;
  assistantMessages: AssistantMessage[];
  durationMs?: number;
  timestamp?: string;
}

export interface ParsedSession {
  metadata: SessionMetadata;
  turns: ConversationTurn[];
}

// ============================================================
// Formatter Options
// ============================================================

export interface FormatOptions {
  showThinking: 'collapsed' | 'expanded' | 'hidden';
  showTools: boolean;
  maxToolLines: number;
}
