import type { FormatOptions } from '../core/types.js';

export interface ShowOptions {
  // Commander's --no-thinking sets `thinking: false`
  thinking?: boolean;
  showThinking?: boolean;
  // Commander's --no-tools sets `tools: false`
  tools?: boolean;
  maxToolLines?: string;
}

export function resolveFormatOptions(opts: ShowOptions): FormatOptions {
  let showThinking: FormatOptions['showThinking'] = 'collapsed';
  if (opts.thinking === false) showThinking = 'hidden';
  if (opts.showThinking) showThinking = 'expanded';

  return {
    showThinking,
    showTools: opts.tools !== false,
    maxToolLines: opts.maxToolLines ? parseInt(opts.maxToolLines, 10) : 50,
  };
}
