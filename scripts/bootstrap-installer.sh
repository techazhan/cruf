#!/usr/bin/env bash
# Cruf — Web Bootstrap Installer (Unix)
# Downloads and installs Cruf.
# Size: ~2KB
#
# Usage:
#   curl -fsSL https://cruf.ai/install.sh | bash
#   # or
#   wget -qO- https://cruf.ai/install.sh | bash

set -euo pipefail

CRUF_NPM_PACKAGE="cruf"
CRUF_GITHUB_REPO="https://github.com/techazhan/cruf"
CRUF_VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

echo ""
echo -e "  ${CYAN}================================================${NC}"
echo -e "  ${CYAN}     Cruf Bootstrap Installer v${CRUF_VERSION}${NC}"
echo -e "  ${CYAN}================================================${NC}"
echo ""

# ─── Check prerequisites ──────────────────────────────────────────
if command -v node &>/dev/null; then
    echo -e "  ${GREEN}[OK] Node.js $(node --version)${NC}"
else
    echo -e "  ${RED}[ERR] Node.js is required. Download from: https://nodejs.org${NC}"
    exit 1
fi

if command -v npm &>/dev/null; then
    echo -e "  ${GREEN}[OK] npm $(npm --version)${NC}"
else
    echo -e "  ${RED}[ERR] npm is required.${NC}"
    exit 1
fi

# ─── Install ──────────────────────────────────────────────────────
echo ""
echo -e "  ${YELLOW}Installing via npm...${NC}"

if npm install -g "$CRUF_NPM_PACKAGE" &>/dev/null; then
    echo -e "  ${GREEN}[OK] Installed from npm!${NC}"
elif command -v git &>/dev/null; then
    echo -e "  ${YELLOW}npm failed. Cloning from GitHub...${NC}"
    INSTALL_DIR="${HOME}/cruf"
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 "${CRUF_GITHUB_REPO}.git" "$INSTALL_DIR" 2>/dev/null || {
        echo -e "  ${YELLOW}GitHub clone failed. Downloading ZIP...${NC}"
        ZIP_URL="${CRUF_GITHUB_REPO}/archive/refs/heads/main.zip"
        TMP_DIR=$(mktemp -d)
        cd "$TMP_DIR"
        if command -v curl &>/dev/null; then
            curl -fsSL "$ZIP_URL" -o cruf.zip
        else
            wget -q "$ZIP_URL" -O cruf.zip
        fi
        unzip -q cruf.zip
        mkdir -p "$INSTALL_DIR"
        cp -r cruf-main/* "$INSTALL_DIR"/
        rm -rf "$TMP_DIR"
    }

    cd "$INSTALL_DIR"
    npm install &>/dev/null
    npm link &>/dev/null
    echo -e "  ${GREEN}[OK] Installed from source!${NC}"
else
    echo -e "  ${RED}[ERR] All installation methods failed.${NC}"
    echo -e "  Install manually: npm install -g cruf"
    exit 1
fi

# ─── Verify ───────────────────────────────────────────────────────
echo ""
if cruf --version &>/dev/null; then
    echo -e "  ${GREEN}[OK] Cruf is ready!${NC}"
else
    echo -e "  ${YELLOW}[WARN] 'cruf' command not found. Try: node ~/cruf/bin/cruf.js${NC}"
fi

echo ""
echo -e "  ${CYAN}------------------------------------------------${NC}"
echo -e "  Quick Start:"
echo -e "    cruf                      Start interactive chat"
echo -e "    cruf --help               View all options"
echo ""
echo -e "  Set API Key:"
echo -e '    export CRUF_API_KEY="your-key"'
echo ""
echo -e "  ${CYAN}https://github.com/cruf/cruf${NC}"
echo -e "  ${CYAN}------------------------------------------------${NC}"
echo ""
