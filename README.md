# ccdigest

Format [Claude Code](https://docs.anthropic.com/en/docs/claude-code) session data into readable Markdown for team sharing and code review.

Claude Code stores session logs as JSONL files under `~/.claude/projects/`. ccdigest reads these files and converts them into clean, human-readable Markdown.

## Installation

```bash
npm install -g ccdigest
```

Or run directly with npx:

```bash
npx ccdigest list
```

## Usage

### List sessions

```bash
ccdigest list
ccdigest list --branch main
ccdigest list --json
```

### Show session as Markdown

```bash
ccdigest show <session-id>
ccdigest show <session-id-1> <session-id-2>  # merge multiple sessions
```

### Export to file

```bash
ccdigest export <session-id> -o output.md
ccdigest export <id-1> <id-2> -o combined.md
```

### Options

| Option | Description |
|--------|-------------|
| `--project <path>` | Project path (defaults to cwd) |
| `--no-thinking` | Hide thinking blocks |
| `--show-thinking` | Show thinking blocks expanded |
| `--no-tools` | Hide tool calls |
| `--max-tool-lines <n>` | Max lines for tool results (default: 50) |

## Development

```bash
npm install
npm run build
npm test
```

## License

[MIT](LICENSE)
