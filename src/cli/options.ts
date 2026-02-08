import type { FormatOptions } from '../core/types.js';

export interface ShowOptions {
  // Commander's --no-filter sets `filter: false`
  filter?: boolean;
}

export function resolveFormatOptions(opts: ShowOptions, projectPath: string): FormatOptions {
  return {
    noFilter: opts.filter === false,
    projectPath,
  };
}
