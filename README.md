# ccdigest

Format [Claude Code](https://docs.anthropic.com/en/docs/claude-code) session data into readable Markdown for team sharing and code review.

Claude Code stores session logs as JSONL files under `~/.claude/projects/`. ccdigest reads these files and converts them into clean, human-readable Markdown.

## Installation

```bash
npm install -g @henteko/ccdigest
```

Or run directly with npx:

```bash
npx @henteko/ccdigest list
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
ccdigest show --branch feature/login          # show all sessions for a branch
ccdigest show <session-id> --no-filter        # show all information
```

By default, `show` outputs a filtered view suitable for sharing:

- **Project path** is shown as basename only (e.g. `my-project` instead of `/Users/you/dev/my-project`)
- **Thinking blocks** are hidden
- **Tool calls** are shown with relativized file paths
- **Tool results** are hidden

Use `--no-filter` to include all information (full paths, thinking blocks collapsed, tool results up to 50 lines).

### Export to file

```bash
ccdigest show <session-id> > output.md
ccdigest show <id-1> <id-2> > combined.md
ccdigest show --branch feature/login > branch.md
```

### Options

| Option | Description |
|--------|-------------|
| `--project <path>` | Project path (defaults to cwd) |
| `--branch <name>` | Show all sessions for a git branch (show) / Filter by branch (list) |
| `--no-filter` | Show all information (full paths, thinking blocks, tool results) |

## Development

```bash
npm install
npm run build
npm test
```

## Release

1. Update version in `package.json`:

```bash
npm version patch  # or minor, major
```

2. Push the tag:

```bash
git push origin main --tags
```

3. Publish to npm:

```bash
npm publish --access public
```

`prepublishOnly` hook will automatically run build and tests before publishing.

## License

[MIT](LICENSE)
