#!/usr/bin/env node

/**
 * Post-install script for Cruf.
 * Creates default config directory and prints setup instructions.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');

function printBanner() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║              Cruf — AI Coding Assistant        ║');
  console.log('  ║     Thank you for installing!                   ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
}

function setup() {
  printBanner();

  // Create user config directory
  const configDir = path.join(os.homedir(), '.config', 'cruf');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('  ✔ Created config directory:', configDir);
  }

  // Copy default config if not exists
  const defaultConfigPath = path.join(PKG_ROOT, '.cruf.json');
  const userConfigPath = path.join(configDir, 'cruf.json');

  if (!fs.existsSync(userConfigPath) && fs.existsSync(defaultConfigPath)) {
    fs.copyFileSync(defaultConfigPath, userConfigPath);
    console.log('  ✔ Created default config at:', userConfigPath);
  }

  console.log('');
  console.log('  ────────────────────────────────────────────────');
  console.log('  Quick Start:');
  console.log('');
  console.log('    cruf                          Start interactive chat');
  console.log('    cruf "build me a React app"   One-shot prompt');
  console.log('');
  console.log('  Set your API key:');
  console.log('');
  console.log('    # For OpenCode (default — free tier available):');
  console.log('    export CRUF_API_KEY=your-key');
  console.log('');
  console.log('    # For OpenAI:');
  console.log('    export OPENAI_API_KEY=your-key');
  console.log('');
  console.log('    # For Anthropic:');
  console.log('    export ANTHROPIC_API_KEY=your-key');
  console.log('');
  console.log('  Configure:');
  console.log('    cruf --init           Create .cruf.json in project');
  console.log('    cruf --config        View current config');
  console.log('    cruf --help          View all options');
  console.log('');
  console.log('  ────────────────────────────────────────────────');
  console.log('  Documentation: https://github.com/techazhan/cruf');
  console.log('  Report issues: https://github.com/techazhan/cruf/issues');
  console.log('');
}

setup();
