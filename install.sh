#!/usr/bin/env bash
set -euo pipefail

CRUF_VERSION="1.0.0"
CRUF_NAME="cruf"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo ""
echo -e "  ${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "  ${CYAN}║          Cruf Installer for Unix               ║${NC}"
echo -e "  ${CYAN}║     Terminal AI Coding Assistant               ║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Check prerequisites ──────────────────────────────────────────
echo -e "  ${YELLOW}◆ Checking prerequisites...${NC}"

if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✔ Node.js $NODE_VERSION detected${NC}"
else
    echo -e "  ${RED}✘ Node.js is required but not found.${NC}"
    echo -e "    Download from: https://nodejs.org (v18 or later)"
    exit 1
fi

if command -v npm &>/dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}✔ npm $NPM_VERSION detected${NC}"
else
    echo -e "  ${RED}✘ npm is required but not found.${NC}"
    exit 1
fi

if command -v git &>/dev/null; then
    echo -e "  ${GREEN}✔ Git detected${NC}"
else
    echo -e "  ${YELLOW}⚠ Git not found (optional)${NC}"
fi

echo ""

# ─── Install ───────────────────────────────────────────────────────
echo -e "  ${YELLOW}◆ Installing Cruf v$CRUF_VERSION...${NC}"
echo ""

if npm list -g "$CRUF_NAME" &>/dev/null; then
    echo -e "  ${YELLOW}⚠ Cruf is already installed globally.${NC}"
    read -rp "    Reinstall? (y/N) " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        echo -e "  ◌ Skipping installation."
        exit 0
    fi
fi

echo -e "  ◌ Installing from npm..."
if npm install -g cruf &>/dev/null; then
    echo -e "  ${GREEN}✔ Cruf installed successfully!${NC}"
else
    echo -e "  ${YELLOW}◌ npm global install failed. Installing from source...${NC}"

    INSTALL_DIR="${HOME}/cruf"
    if [ ! -d "$INSTALL_DIR" ]; then
        git clone https://github.com/techazhan/cruf.git "$INSTALL_DIR" 2>/dev/null || {
            echo -e "  ${RED}✘ Failed to clone repository.${NC}"
            echo -e "    Please install manually: npm install -g cruf"
            exit 1
        }
    fi

    cd "$INSTALL_DIR"
    npm install
    npm link
    echo -e "  ${GREEN}✔ Cruf installed from source!${NC}"
fi

# ─── Configuration ────────────────────────────────────────────────
echo ""
echo -e "  ${YELLOW}◆ Configuration${NC}"
echo ""

CONFIG_DIR="${HOME}/.config/cruf"
mkdir -p "$CONFIG_DIR"

CONFIG_FILE="${CONFIG_DIR}/cruf.json"
if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << 'EOF'
{
  "default_provider": "opencode",
  "default_model": "deepseek-v4-flash-free",
  "default_agent": "assistant",
  "providers": {
    "opencode": {
      "api_base": "https://api.opencode.ai/v1",
      "api_key": "",
      "models": {
        "deepseek-v4-flash-free": { "max_tokens": 64000, "temperature": 0.7 },
        "deepseek-v4-flash": { "max_tokens": 64000, "temperature": 0.7 },
        "deepseek-v4": { "max_tokens": 128000, "temperature": 0.7 },
        "gpt-4o": { "max_tokens": 128000, "temperature": 0.7 },
        "claude-sonnet-4": { "max_tokens": 128000, "temperature": 0.7 }
      }
    }
  },
  "agents": {
    "assistant": { "description": "General-purpose coding assistant", "mode": "primary", "tools": ["read","write","edit","glob","grep","bash","websearch","webfetch","task"] },
    "coder": { "description": "Focused on writing code", "mode": "primary", "tools": ["read","write","edit","glob","grep","bash"] },
    "explorer": { "description": "Codebase exploration", "mode": "readonly", "tools": ["read","glob","grep","webfetch"] },
    "debugger": { "description": "Debugging specialist", "mode": "primary", "tools": ["read","edit","grep","bash"] }
  }
}
EOF
    echo -e "  ${GREEN}✔ Default config created at: $CONFIG_FILE${NC}"
else
    echo -e "  ${GREEN}✔ Config already exists at: $CONFIG_FILE${NC}"
fi

if [ -z "${CRUF_API_KEY:-}" ]; then
    echo ""
    echo -e "  ${YELLOW}⚠ No CRUF_API_KEY set.${NC}"
    echo -e "    The default model is free and may not need a key."
    echo -e "    To set a custom API key:"
    echo -e "    ${GRAY}export CRUF_API_KEY=\"your-key\"${NC}"
fi

# ─── Success ───────────────────────────────────────────────────────
echo ""
echo -e "  ${CYAN}────────────────────────────────────────────────${NC}"
echo -e "  ${GREEN}✔ Cruf v$CRUF_VERSION is ready!${NC}"
echo ""
echo -e "  Quick Start:"
echo -e "    cruf                      Start interactive chat"
echo -e '    cruf "hello"             One-shot mode'
echo -e "    cruf --init              Init config in project"
echo -e "    cruf --help              View all options"
echo ""
echo -e "  ${GREEN}https://github.com/techazhan/cruf${NC}"
echo -e "  ${CYAN}────────────────────────────────────────────────${NC}"
echo ""
