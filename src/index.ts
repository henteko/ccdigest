#!/usr/bin/env node
import { Command } from 'commander';
import { runList } from './cli/commands/list.js';
import { runShow } from './cli/commands/show.js';

const program = new Command();

program
  .name('ccdigest')
  .description('Format Claude Code session data into readable Markdown')
  .version('0.1.0');

program
  .command('list')
  .description('List available sessions')
  .option('--project <path>', 'Project path (defaults to cwd)')
  .option('--branch <name>', 'Filter by git branch')
  .option('--json', 'Output as JSON')
  .action(runList);

program
  .command('show [session-ids...]')
  .description('Display session(s) as Markdown (stdout). Multiple IDs are merged chronologically.')
  .option('--branch <name>', 'Show all sessions for a git branch')
  .option('--no-filter', 'Show all information (full paths, thinking, tool results)')
  .option('--project <path>', 'Project path (defaults to cwd)')
  .action(runShow);


program.parse();
