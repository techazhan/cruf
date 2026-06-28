#!/usr/bin/env node

/**
 * Cruf — Terminal AI Coding Assistant
 * CLI entry point.
 *
 * Usage:
 *   cruf                       Start interactive chat
 *   cruf "prompt"              One-shot mode
 *   cruf --model gpt-4o        Use specific model
 *   cruf --agent coder         Use specific agent
 *   cruf --provider openai     Use specific provider
 *   cruf --init                Init .cruf.json in cwd
 *   cruf --config              Show config
 *   cruf --help                Show help
 *   cruf --version             Show version
 */

import { main } from '../src/index.js';

main().catch((err) => {
  console.error('');
  console.error(`  \x1b[31m✘ Fatal error: ${err.message}\x1b[0m`);
  if (process.env.CRUF_DEBUG) {
    console.error(err);
  }
  process.exit(1);
});
