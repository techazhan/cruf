/**
 * Cruf — Terminal AI Coding Assistant
 * Main entry module.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Print a stunning ASCII banner
 */
function printBanner() {
  console.log('');
  console.log(`  \x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m             \x1b[1m\x1b[38;5;51m██████╗██████╗ ██╗   ██╗███████╗\x1b[0m            \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m            \x1b[1m\x1b[38;5;51m██╔════╝██╔══██╗██║   ██║██╔════╝\x1b[0m            \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m            \x1b[1m\x1b[38;5;51m██║     ██████╔╝██║   ██║█████╗  \x1b[0m            \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m            \x1b[1m\x1b[38;5;51m██║     ██╔══██╗██║   ██║██╔══╝  \x1b[0m            \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m            \x1b[1m\x1b[38;5;51m╚██████╗██║  ██║╚██████╔╝██║     \x1b[0m            \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m             \x1b[1m\x1b[38;5;51m╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     \x1b[0m            \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m           \x1b[2mTerminal AI Coding Assistant\x1b[0m             \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m           \x1b[2mPowered by OpenCode Models & More\x1b[0m        \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m`);
  console.log('');
}

/**
 * Check if we're in interactive terminal
 */
function isInteractive() {
  return process.stdout.isTTY && process.stdin.isTTY;
}

/**
 * Main entry point
 */
export async function main() {
  const args = process.argv.slice(2);

  // No args = interactive mode
  if (args.length === 0) {
    printBanner();
    const { startChat } = await import('./agent/chat.js');
    await startChat({});
    return;
  }

  // Parse CLI flags
  const options = {
    provider: null,
    model: null,
    agent: null,
    prompt: null,
    message: null,
    systemPrompt: null,
    init: false,
    showConfig: false,
    version: false,
    help: false,
    debug: false,
    oneShot: false,
    maxIterations: 20,
    temperature: null,
    maxTokens: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') { options.help = true; i++; }
    else if (arg === '--version' || arg === '-v') { options.version = true; i++; }
    else if (arg === '--init') { options.init = true; i++; }
    else if (arg === '--config') { options.showConfig = true; i++; }
    else if (arg === '--debug') { options.debug = true; process.env.CRUF_DEBUG = '1'; i++; }
    else if (arg === '--provider' && i + 1 < args.length) { options.provider = args[i + 1]; i += 2; }
    else if (arg === '--model' && i + 1 < args.length) { options.model = args[i + 1]; i += 2; }
    else if (arg === '--agent' && i + 1 < args.length) { options.agent = args[i + 1]; i += 2; }
    else if (arg === '--prompt' && i + 1 < args.length) { options.systemPrompt = args[i + 1]; i += 2; }
    else if (arg === '--temperature' && i + 1 < args.length) { options.temperature = parseFloat(args[i + 1]); i += 2; }
    else if (arg === '--max-tokens' && i + 1 < args.length) { options.maxTokens = parseInt(args[i + 1]); i += 2; }
    else if (arg === '--max-iterations' && i + 1 < args.length) { options.maxIterations = parseInt(args[i + 1]); i += 2; }
    else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else {
      // One-shot mode: the argument is the prompt
      options.message = arg;
      options.oneShot = true;
      i++;
    }
  }

  // Handle version
  if (options.version) {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'));
    console.log(`Cruf v${pkg.version}`);
    return;
  }

  // Handle help
  if (options.help) {
    printHelp();
    return;
  }

  // Handle init
  if (options.init) {
    const { initProjectConfig } = await import('./config.js');
    try {
      const configPath = initProjectConfig();
      console.log(`  \x1b[32m✔ Created .cruf.json in ${process.cwd()}\x1b[0m`);
    } catch (err) {
      console.error(`  \x1b[31m✘ ${err.message}\x1b[0m`);
    }
    return;
  }

  // Handle show config
  if (options.showConfig) {
    const { loadConfig, showConfig } = await import('./config.js');
    const config = loadConfig();
    console.log(showConfig(config));
    return;
  }

  // One-shot mode
  if (options.oneShot) {
    printBanner();
    const { startChat } = await import('./agent/chat.js');
    await startChat(options);
    return;
  }

  // Interactive mode
  printBanner();
  const { startChat } = await import('./agent/chat.js');
  await startChat(options);
}

/**
 * Print CLI help
 */
function printHelp() {
  console.log('');
  console.log(`  \x1b[36mCruf\x1b[0m — Terminal AI Coding Assistant`);
  console.log(`  \x1b[2mPowered by OpenCode & multiple LLM providers\x1b[0m`);
  console.log('');
  console.log(`  \x1b[1mUsage:\x1b[0m`);
  console.log(`    cruf                        Start interactive session`);
  console.log(`    cruf "create a React app"    One-shot prompt`);
  console.log('');
  console.log(`  \x1b[1mOptions:\x1b[0m`);
  console.log(`    --provider <name>     Provider to use (opencode, openai, anthropic, google)`);
  console.log(`    --model <name>        Model to use (e.g., deepseek-v4-flash-free, gpt-4o)`);
  console.log(`    --agent <name>        Agent persona (assistant, coder, explorer, debugger)`);
  console.log(`    --prompt <text>       Custom system prompt`);
  console.log(`    --temperature <num>   Sampling temperature (0.0 - 2.0)`);
  console.log(`    --max-tokens <num>    Max tokens in response`);
  console.log(`    --max-iterations <n>  Max tool call iterations`);
  console.log(`    --init                Create .cruf.json in current directory`);
  console.log(`    --config              Show current configuration`);
  console.log(`    --debug               Enable debug output`);
  console.log(`    --version, -v         Show version`);
  console.log(`    --help, -h            Show this help`);
  console.log('');
  console.log(`  \x1b[1mEnvironment Variables:\x1b[0m`);
  console.log(`    CRUF_API_KEY          API key for OpenCode provider`);
  console.log(`    CRUF_API_BASE         API base URL for OpenCode provider`);
  console.log(`    CRUF_DEFAULT_MODEL    Default model override`);
  console.log(`    CRUF_DEFAULT_PROVIDER Default provider override`);
  console.log(`    OPENAI_API_KEY        API key for OpenAI`);
  console.log(`    ANTHROPIC_API_KEY     API key for Anthropic`);
  console.log(`    GOOGLE_API_KEY        API key for Google`);
  console.log('');
  console.log(`  \x1b[1mInteractive Commands:\x1b[0m`);
  console.log(`    /help                 Show help`);
  console.log(`    /clear                Clear screen`);
  console.log(`    /exit                 Exit Cruf`);
  console.log(`    /model <name>         Switch model`);
  console.log(`    /agent <name>         Switch agent`);
  console.log(`    /agents               List agents`);
  console.log(`    /tools                List tools`);
  console.log(`    /prompt <text>        Set custom system prompt`);
  console.log(`    /config               Show configuration`);
  console.log('');
}

export default { main };
