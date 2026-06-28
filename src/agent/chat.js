/**
 * Chat — The interactive chat loop for Cruf.
 * Manages the conversation, streaming, and tool execution flow.
 */

import readline from 'readline';
import logger from '../utils/logger.js';
import { spinner, Spinner } from '../utils/spinner.js';
import { render } from '../utils/markdown.js';
import { getProvider, registerProvider } from '../providers/index.js';
import { OpenAIProvider } from '../providers/openai.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { GoogleProvider } from '../providers/google.js';
import { executeTool, parseToolCall } from '../tools/index.js';
import { createAgentSession, getAgent } from './index.js';
import { loadConfig } from '../config.js';

// Register additional providers if available
try {
  registerProvider('openai', OpenAIProvider);
} catch (e) { /* optional dep */ }

try {
  registerProvider('anthropic', AnthropicProvider);
} catch (e) { /* optional dep */ }

try {
  registerProvider('google', GoogleProvider);
} catch (e) { /* optional dep */ }

/**
 * Start an interactive chat session
 */
export async function startChat(options = {}) {
  const config = loadConfig(options);

  // Determine provider and model
  const providerName = options.provider || config.default_provider || 'opencode';
  const modelName = options.model || config.default_model || 'deepseek-v4-flash-free';
  const agentName = options.agent || config.default_agent || 'assistant';

  // Get the provider config
  const providerConfig = config.providers?.[providerName];
  if (!providerConfig) {
    logger.error(`Provider "${providerName}" not found in config.`);
    logger.info(`Available providers: ${Object.keys(config.providers || {}).join(', ')}`);
    process.exit(1);
  }

  // Create provider instance
  let provider;
  try {
    provider = getProvider(providerName, providerConfig);
  } catch (e) {
    logger.error(`Failed to initialize provider "${providerName}": ${e.message}`);
    process.exit(1);
  }

  if (!provider.isConfigured()) {
    logger.warn(`Provider "${providerName}" has no API key configured.`);
    if (providerName !== 'opencode') {
      logger.info(`Set ${providerName === 'openai' ? 'OPENAI_API_KEY' : providerName === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} environment variable or configure in .cruf.json`);
    }
  }

  // Create the agent session
  const customPrompt = options.prompt || options.systemPrompt || '';
  const session = createAgentSession(agentName, config, customPrompt);

  // Print welcome
  const agent = getAgent(agentName);
  logger.header(`Cruf — ${agentName} agent`);
  logger.label('Provider', `${providerName}/${modelName}`);
  logger.label('Agent', `${agentName} — ${agent?.description || ''}`);
  logger.label('Working Dir', process.cwd());
  logger.divider();

  // Handle one-shot mode
  if (options.message) {
    session.messages.push({ role: 'user', content: options.message });
    await processUserMessage(session, provider, modelName, config);
    return;
  }

  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '',
  });

  // Print help
  printHelp();

  // Chat loop
  while (true) {
    const input = await askQuestion(rl, '\n  \x1b[35mYou\x1b[0m › ');

    if (!input || !input.trim()) continue;

    const trimmed = input.trim();

    // Special commands
    if (trimmed === '/exit' || trimmed === '/quit') {
      logger.info('Goodbye, Sir.');
      break;
    }

    if (trimmed === '/help') {
      printHelp();
      continue;
    }

    if (trimmed === '/clear') {
      console.clear();
      logger.header('Cruf');
      continue;
    }

    if (trimmed.startsWith('/model ')) {
      const newModel = trimmed.slice(7).trim();
      if (newModel) {
        logger.info(`Switching model to: ${newModel}`);
        options.model = newModel;
        // Re-create session with new model context
        logger.info('Model preference saved for future messages.');
      }
      continue;
    }

    if (trimmed.startsWith('/agent ')) {
      const newAgent = trimmed.slice(7).trim();
      if (newAgent) {
        const agentInfo = getAgent(newAgent);
        if (agentInfo) {
          logger.info(`Switching to agent: ${newAgent} — ${agentInfo.description}`);
          options.agent = newAgent;
          session.name = newAgent;
          session.config = agentInfo;
          logger.info('Agent switched. Next message will use the new agent context.');
        } else {
          logger.error(`Unknown agent: "${newAgent}". Available: ${listAgents().map(a => a.name).join(', ')}`);
        }
      }
      continue;
    }

    if (trimmed === '/agents') {
      const { listAgents } = await import('./index.js');
      const agents = listAgents();
      logger.info('Available agents:');
      for (const a of agents) {
        logger.label(`  ${a.name}`, `${a.description} [tools: ${a.tools.join(', ')}]`);
      }
      continue;
    }

    if (trimmed === '/tools') {
      const { listTools } = await import('../tools/index.js');
      const tools = listTools();
      logger.info('Available tools:');
      for (const t of tools) {
        logger.label(`  ${t.name}`, t.schema?.description || '');
      }
      continue;
    }

    if (trimmed.startsWith('/prompt ')) {
      const newPrompt = trimmed.slice(8).trim();
      if (newPrompt) {
        options.prompt = newPrompt;
        // Rebuild session
        const newSession = createAgentSession(agentName, config, newPrompt);
        session.messages = newSession.messages;
        session.systemPrompt = newSession.systemPrompt;
        logger.info('System prompt updated.');
      }
      continue;
    }

    if (trimmed === '/config') {
      const { showConfig } = await import('../config.js');
      logger.info('Current configuration:');
      console.log(showConfig(config));
      continue;
    }

    // Add user message
    session.messages.push({ role: 'user', content: trimmed });

    // Process
    await processUserMessage(session, provider, modelName, config, options);
  }

  rl.close();
}

/**
 * Process a user message: get AI response, handle tool calls
 */
async function processUserMessage(session, provider, modelName, config, options = {}) {
  const maxIterations = options.maxIterations || 20;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Show thinking indicator
    const thinkSpinner = new Spinner('Thinking...');
    await thinkSpinner.start();

    let fullResponse = '';
    let toolCallDetected = false;

    try {
      // Stream the response
      const stream = provider.stream(session.messages, {
        model: modelName,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 64000,
      });

      thinkSpinner.stop();

      // Process stream
      let reasoningContent = '';
      let contentBuffer = '';

      for await (const chunk of stream) {
        if (chunk.type === 'reasoning') {
          reasoningContent += chunk.content;
          if (config.ui?.show_thinking !== false) {
            process.stdout.write(`\x1b[90m${chunk.content}\x1b[0m`);
          }
        } else if (chunk.type === 'content') {
          contentBuffer += chunk.content;
          process.stdout.write(chunk.content);
        } else if (chunk.type === 'finish') {
          // Done
        }
      }

      fullResponse = contentBuffer;

      if (reasoningContent && config.ui?.show_thinking !== false) {
        console.log('\n');
      }

      console.log('');

      // Check if the response contains a tool call
      const toolCall = parseToolCall(fullResponse.trim());

      if (toolCall) {
        toolCallDetected = true;

        try {
          // Execute the tool
          const result = await executeTool(toolCall.name, toolCall.args, {
            showCalls: config.ui?.show_tool_calls !== false,
          });

          // Format tool result for the model
          const toolResult = typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2);

          // Add assistant message with tool call
          session.messages.push({
            role: 'assistant',
            content: fullResponse,
          });

          // Add tool result as a user message
          session.messages.push({
            role: 'user',
            content: `Tool "${toolCall.name}" returned:\n\`\`\`\n${toolResult}\n\`\`\`\n\nContinue with the task based on this result.`,
          });

          // Continue the loop to let the AI process the result
          continue;
        } catch (toolError) {
          logger.error(`Tool execution failed: ${toolError.message}`);

          session.messages.push({
            role: 'assistant',
            content: fullResponse,
          });

          session.messages.push({
            role: 'user',
            content: `Tool "${toolCall.name}" failed with error: ${toolError.message}\n\nPlease try a different approach or inform the user.`,
          });
          continue;
        }
      }

      // No tool call — this is the final response
      session.messages.push({
        role: 'assistant',
        content: fullResponse,
      });

      break;
    } catch (err) {
      thinkSpinner.stop();
      logger.error(`Error: ${err.message}`);
      if (process.env.CRUF_DEBUG) {
        console.error(err);
      }
      break;
    }
  }
}

/**
 * Ask a question via readline
 */
function askQuestion(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Print help text
 */
function printHelp() {
  console.log('');
  logger.info('Commands:');
  logger.label('  /help', 'Show this help');
  logger.label('  /clear', 'Clear the screen');
  logger.label('  /exit', 'Exit Cruf');
  logger.label('  /model <name>', 'Switch model (e.g. /model gpt-4o)');
  logger.label('  /agent <name>', 'Switch agent (e.g. /agent coder)');
  logger.label('  /agents', 'List available agents');
  logger.label('  /tools', 'List available tools');
  logger.label('  /prompt <text>', 'Set custom system prompt');
  logger.label('  /config', 'Show current configuration');
  console.log('');
}

export default { startChat };
