# Cruf — Terminal AI Coding Assistant

> **Cruf** is a full-featured terminal AI coding assistant, inspired by OpenCode.  
> It runs in your terminal, connects to any LLM provider, and helps you write, edit, search, and manage code — all from the command line.

![Cruf Banner](https://raw.githubusercontent.com/cruf/cruf/main/banner.png)

---

## Features

- **🤖 Multi-Provider** — Use OpenCode (free default), OpenAI, Anthropic Claude, or Google Gemini
- **🛠️ Full Tool System** — Read, write, edit, glob, grep, bash, web search, web fetch
- **🧠 Agent Personas** — Assistant, Coder, Explorer, Debugger — each with tailored tools
- **⚡ Streaming Responses** — See responses token-by-token in real time
- **🎨 Beautiful Terminal UI** — Colored output, spinners, structured formatting
- **📁 Skill System** — Load skill packs for specialized tasks
- **🔧 Configurable** — JSON config file + environment variables + CLI flags
- **🔌 Extensible** — Plugin system for custom tools and providers
- **🌍 Cross-Platform** — Windows, macOS, Linux

---

## Quick Install

### One-Liner

```bash
# macOS / Linux
curl -fsSL https://cruf.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://cruf.ai/install.ps1 | iex
```

### npm

```bash
npm install -g cruf
```

### Manual

```bash
git clone https://github.com/cruf/cruf.git
cd cruf
npm install
npm link
```

---

## Quick Start

```bash
# Start interactive chat
cruf

# One-shot prompt
cruf "create a React todo app with TypeScript"

# Use a specific model
cruf --model gpt-4o --provider openai

# Use a specific agent
cruf --agent coder

# Init config in current project
cruf --init
```

### Interactive Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help |
| `/clear` | Clear screen |
| `/exit` | Exit Cruf |
| `/model <name>` | Switch model |
| `/agent <name>` | Switch agent |
| `/agents` | List agents |
| `/tools` | List tools |
| `/prompt <text>` | Set custom system prompt |
| `/config` | Show configuration |

---

## Configuration

Cruf merges config from multiple sources (priority order):
1. CLI flags
2. Environment variables
3. Project `.cruf.json`
4. User `~/.config/cruf/cruf.json`
5. OpenCode `~/.config/opencode/opencode.jsonc` (backward compat)
6. Package defaults

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CRUF_API_KEY` | API key for OpenCode provider |
| `CRUF_API_BASE` | API base URL for OpenCode |
| `CRUF_DEFAULT_MODEL` | Default model override |
| `CRUF_DEFAULT_PROVIDER` | Default provider override |
| `OPENAI_API_KEY` | API key for OpenAI |
| `ANTHROPIC_API_KEY` | API key for Anthropic |
| `GOOGLE_API_KEY` | API key for Google |

---

## Providers

Cruf supports multiple LLM providers out of the box:

| Provider | Models | API Key |
|----------|--------|---------|
| **OpenCode** | deepseek-v4-flash-free, deepseek-v4, gpt-4o, claude-sonnet-4 | `CRUF_API_KEY` |
| **OpenAI** | gpt-4o, gpt-4o-mini, o3-mini, o1 | `OPENAI_API_KEY` |
| **Anthropic** | claude-sonnet-4, claude-3.5-sonnet, claude-3.5-haiku | `ANTHROPIC_API_KEY` |
| **Google** | gemini-2.5-pro, gemini-2.5-flash | `GOOGLE_API_KEY` |

The default provider is **OpenCode** with the **deepseek-v4-flash-free** model (free tier).

---

## Agents

Cruf comes with 4 built-in agents:

| Agent | Description | Tools |
|-------|-------------|-------|
| **assistant** | General-purpose coding assistant | All tools |
| **coder** | Focused on writing and editing code | read, write, edit, glob, grep, bash |
| **explorer** | Codebase exploration (read-only) | read, glob, grep, webfetch |
| **debugger** | Systematic debugging specialist | read, edit, grep, bash |

---

## Tools

| Tool | Description |
|------|-------------|
| `read` | Read files or directories |
| `write` | Create or overwrite files |
| `edit` | Targeted text replacement in files |
| `glob` | Find files by pattern |
| `grep` | Search file contents |
| `bash` | Execute shell commands |
| `websearch` | Search the web |
| `webfetch` | Fetch URL contents |
| `task` | Launch sub-agents |

---

## CLI Options

```
Usage:
  cruf                        Start interactive session
  cruf "prompt"               One-shot mode

Options:
  --provider <name>     Provider (opencode, openai, anthropic, google)
  --model <name>        Model (deepseek-v4-flash-free, gpt-4o, etc.)
  --agent <name>        Agent persona (assistant, coder, explorer, debugger)
  --prompt <text>       Custom system prompt
  --temperature <num>   Sampling temperature (0.0 - 2.0)
  --max-tokens <num>    Max tokens in response
  --max-iterations <n>  Max tool call iterations
  --init                Create .cruf.json in current directory
  --config              Show current configuration
  --debug               Enable debug output
  --version, -v         Show version
  --help, -h            Show this help
```

---

## Skill System

Cruf supports loading skill packs — structured prompt/tool configurations for specialized tasks:

```bash
# Load a skill from your project
cruf --prompt "$(cat .agents/skills/my-skill/SKILL.md)"
```

Skills are stored in `.agents/skills/` following the OpenCode skill format.

---

## Development

```bash
# Clone
git clone https://github.com/cruf/cruf.git
cd cruf

# Install dependencies
npm install

# Run in dev mode
node bin/cruf.js

# Link globally
npm link
cruf --help
```

---

## Architecture

```
cruf/
├── bin/
│   ├── cruf.js              # CLI entry point
│   └── postinstall.js        # Post-install setup
├── src/
│   ├── index.js              # Main module / CLI logic
│   ├── config.js             # Configuration management
│   ├── cli.js                # CLI argument parsing
│   ├── providers/
│   │   ├── index.js          # Provider registry
│   │   ├── opencode.js       # OpenCode API provider
│   │   ├── openai.js         # OpenAI provider
│   │   ├── anthropic.js      # Anthropic provider
│   │   └── google.js         # Google Gemini provider
│   ├── agent/
│   │   ├── index.js          # Agent manager
│   │   └── chat.js           # Chat loop / interaction
│   ├── tools/
│   │   ├── index.js          # Tool registry
│   │   ├── read.js           # File read
│   │   ├── write.js          # File write
│   │   ├── edit.js           # File edit
│   │   ├── glob.js           # Glob search
│   │   ├── grep.js           # Grep search
│   │   ├── bash.js           # Shell execution
│   │   ├── websearch.js      # Web search
│   │   ├── webfetch.js       # Web fetch
│   │   └── task.js           # Sub-agent launcher
│   ├── skills/
│   │   └── index.js          # Skill loader
│   └── utils/
│       ├── logger.js         # Terminal output
│       ├── spinner.js        # Loading spinner
│       └── markdown.js       # Markdown rendering
├── .cruf.json                # Default config
├── install.ps1               # Windows installer
├── install.sh                # Unix installer
├── package.json
├── README.md
└── LICENSE
```

---

## License

MIT — see [LICENSE](LICENSE)

---

## Credits

- **OpenCode** for the inspiration and API compatibility
- All the LLM providers for making AI accessible
- You, for being awesome

---

<p align="center">
  <b>Built with ❤️ by Cruf Labs</b><br>
  <a href="https://github.com/cruf/cruf">GitHub</a> •
  <a href="https://cruf.ai">Website</a> •
  <a href="https://twitter.com/cruf">Twitter</a>
</p>
