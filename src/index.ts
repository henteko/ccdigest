#!/usr/bin/env node
import { Command } from 'commander';
import { runList } from './cli/commands/list.js';
import { runShow } from './cli/commands/show.js';
import { runExport } from './cli/commands/export.js';

const program = new Command();

program
  .name('flight-recorder')
  .description('Format Claude Code session data into readable Markdown')
  .version('0.1.0');

program
  .command('list')
  .description('List available sessions')
  .option('--project <path>', 'Project path (defaults to cwd)')
  .option('--branch <name>', 'Filter by git branch')
  .option('--json', 'Output as JSON')
  .action(runList);

const showFormatOptions = (cmd: Command) =>
  cmd
    .option('--no-thinking', 'Hide thinking blocks')
    .option('--show-thinking', 'Show thinking blocks expanded')
    .option('--no-tools', 'Hide tool calls')
    .option('--max-tool-lines <n>', 'Max lines for tool results (default: 50)')
    .option('--project <path>', 'Project path (defaults to cwd)');

showFormatOptions(
  program
    .command('show <session-ids...>')
    .description('Display session(s) as Markdown (stdout). Multiple IDs are merged chronologically.')
).action(runShow);

showFormatOptions(
  program
    .command('export <session-ids...>')
    .description('Export session(s) to a Markdown file. Multiple IDs are merged chronologically.')
    .requiredOption('-o, --output <file>', 'Output file path')
).action(runExport);

program.parse();
