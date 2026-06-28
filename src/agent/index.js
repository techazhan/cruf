/**
 * Agent Manager — Manages agents and their configurations.
 * Agents are specialized AI personas with specific tool access and behavior.
 */

import logger from '../utils/logger.js';
import { getProvider } from '../providers/index.js';
import { getToolSystemPrompt } from '../tools/index.js';

const AGENT_REGISTRY = {};

/**
 * Register an agent
 */
export function registerAgent(name, config) {
  AGENT_REGISTRY[name] = {
    name,
    ...config,
    tools: config.tools || [],
  };
}

/**
 * Get an agent by name
 */
export function getAgent(name) {
  return AGENT_REGISTRY[name];
}

/**
 * List all registered agents
 */
export function listAgents() {
  return Object.entries(AGENT_REGISTRY).map(([name, agent]) => ({
    name,
    description: agent.description || '',
    mode: agent.mode || 'primary',
    tools: agent.tools || [],
  }));
}

/**
 * Build the system prompt for a given agent
 */
export function buildSystemPrompt(agentName, config, userPrompt) {
  const agent = AGENT_REGISTRY[agentName];
  if (!agent) {
    throw new Error(`Unknown agent: "${agentName}". Available: ${Object.keys(AGENT_REGISTRY).join(', ')}`);
  }

  const parts = [];

  // Core identity
  parts.push(agent.systemPrompt || `You are Cruf, an AI coding assistant. You help the user write, edit, and manage code from the terminal. You are powered by ${config.default_provider}/${config.default_model}.`);

  // Agent-specific prompt
  if (agent.prompt) {
    parts.push(`\n${agent.prompt}`);
  }

  // Mode-specific instructions
  if (agent.mode === 'readonly') {
    parts.push('\nIMPORTANT: You are in read-only mode. You can read files and search, but you CANNOT make any changes to the filesystem.');
  }

  // Tool instructions
  const toolPrompt = getToolSystemPrompt(agent.tools);
  if (toolPrompt) {
    parts.push(toolPrompt);
  }

  // User's custom prompt
  if (userPrompt) {
    parts.push(`\n\n## Additional Context\n\n${userPrompt}`);
  }

  return parts.join('\n\n');
}

/**
 * Create an agent instance for a chat session
 */
export function createAgentSession(agentName, config, userPrompt) {
  const agent = AGENT_REGISTRY[agentName];
  if (!agent) {
    throw new Error(`Unknown agent: "${agentName}". Available: ${Object.keys(AGENT_REGISTRY).join(', ')}`);
  }

  const systemPrompt = buildSystemPrompt(agentName, config, userPrompt);

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  return {
    name: agentName,
    config: agent,
    messages,
    systemPrompt,
  };
}

// Register default agents
registerAgent('assistant', {
  description: 'General-purpose coding assistant with full tool access.',
  mode: 'primary',
  tools: ['read', 'write', 'edit', 'glob', 'grep', 'bash', 'websearch', 'webfetch', 'task'],
  systemPrompt: `You are Cruf, a terminal AI coding assistant. You are professional, precise, and efficient.

## Working Style
- Answer questions directly and concisely
- When given a multi-step task, lay out a quick plan, confirm, then execute
- After completing work, summarise what was done and any side effects
- Use proper structure in your responses — bullet points, code blocks, sections
- Write clean, well-documented code

## Code Quality
- Write production-quality code with proper error handling
- Use modern syntax and best practices
- Include comments only when the code's purpose isn't obvious
- Prefer editing existing files over creating new ones unless explicitly required
- Never include placeholder code or TODOs in final output`,
});

registerAgent('coder', {
  description: 'Focused on writing and editing code. Full file system access.',
  mode: 'primary',
  tools: ['read', 'write', 'edit', 'glob', 'grep', 'bash'],
  systemPrompt: `You are Cruf, a coding specialist. You write clean, efficient, production-quality code.

## Focus
- Writing and editing code is your primary function
- Create complete, working implementations
- Prefer simple solutions over complex ones
- Ensure all code is properly structured and follows language conventions
- Always run tests or build steps after making changes to verify correctness`,
});

registerAgent('explorer', {
  description: 'Fast codebase exploration and search. Read-only.',
  mode: 'readonly',
  tools: ['read', 'glob', 'grep', 'webfetch'],
  systemPrompt: `You are Cruf, a codebase exploration agent. You help users understand their code.

## Focus
- Read and explain code structure
- Search for patterns, definitions, and usages
- Answer questions about how code works
- You are READ-ONLY — you cannot make any changes
- Be thorough in your exploration and precise in your findings`,
});

registerAgent('debugger', {
  description: 'Debugging specialist. Can run code and inspect outputs.',
  mode: 'primary',
  tools: ['read', 'edit', 'grep', 'bash'],
  systemPrompt: `You are Cruf, a debugging specialist. You systematically identify and fix issues.

## Debugging Process
1. Understand the symptom — what's going wrong?
2. Reproduce the issue — run the code to see the error
3. Hypothesize the root cause
4. Test your hypothesis by checking specific parts of the code
5. Fix the issue with minimal, targeted changes
6. Verify the fix works
7. Explain what went wrong and how it was fixed`,
});

export default {
  registerAgent,
  getAgent,
  listAgents,
  buildSystemPrompt,
  createAgentSession,
};
