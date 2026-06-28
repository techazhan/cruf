/**
 * Tool Registry — Manages all tools available to Cruf agents.
 * Each tool is an async function that receives arguments and returns a result.
 */

import { readTool } from './read.js';
import { writeTool } from './write.js';
import { editTool } from './edit.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { bashTool } from './bash.js';
import { websearchTool } from './websearch.js';
import { webfetchTool } from './webfetch.js';
import { taskTool } from './task.js';
import logger from '../utils/logger.js';

const TOOL_REGISTRY = {};

/**
 * Register a tool
 */
export function registerTool(name, handler, schema) {
  TOOL_REGISTRY[name] = { handler, schema };
}

/**
 * Get a tool by name
 */
export function getTool(name) {
  return TOOL_REGISTRY[name];
}

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(name, args, context = {}) {
  const tool = TOOL_REGISTRY[name];
  if (!tool) {
    throw new Error(`Unknown tool: "${name}". Available: ${Object.keys(TOOL_REGISTRY).join(', ')}`);
  }

  if (context.showCalls !== false) {
    logger.toolCall(name, args);
  }

  return await tool.handler(args, context);
}

/**
 * List all registered tools
 */
export function listTools() {
  return Object.entries(TOOL_REGISTRY).map(([name, tool]) => ({
    name,
    schema: tool.schema,
  }));
}

/**
 * Get tool schemas in OpenAI function-calling format
 */
export function getToolSchemas(names) {
  const tools = names || Object.keys(TOOL_REGISTRY);
  return tools
    .filter(name => TOOL_REGISTRY[name])
    .map(name => {
      const tool = TOOL_REGISTRY[name];
      return {
        type: 'function',
        function: {
          name,
          description: tool.schema?.description || '',
          parameters: tool.schema?.parameters || {
            type: 'object',
            properties: {},
          },
        },
      };
    });
}

/**
 * Parse a tool call from an LLM response
 */
export function parseToolCall(text) {
  // Try JSON format: {"name": "tool_name", "args": {...}}
  try {
    const parsed = JSON.parse(text);
    if (parsed.name && TOOL_REGISTRY[parsed.name]) {
      return { name: parsed.name, args: parsed.args || {} };
    }
  } catch (e) { /* not JSON */ }

  // Try function-calling format: {"function": {"name": "...", "arguments": "..."}}
  try {
    const parsed = JSON.parse(text);
    if (parsed.function?.name && TOOL_REGISTRY[parsed.function.name]) {
      return {
        name: parsed.function.name,
        args: JSON.parse(parsed.function.arguments || '{}'),
      };
    }
  } catch (e) { /* not function call */ }

  // Try XML-like format: <tool_call name="...">args</tool_call>
  const xmlMatch = text.match(/<tool_call\s+name=["'](\w+)["']>([\s\S]*?)<\/tool_call>/);
  if (xmlMatch && TOOL_REGISTRY[xmlMatch[1]]) {
    try {
      return { name: xmlMatch[1], args: JSON.parse(xmlMatch[2]) };
    } catch (e) {
      return { name: xmlMatch[1], args: { input: xmlMatch[2] } };
    }
  }

  // Try code block format with tool:// prefix
  const codeMatch = text.match(/```(?:json)?\s*\n?tool:\/\/(\w+)\s*\n([\s\S]*?)```/);
  if (codeMatch && TOOL_REGISTRY[codeMatch[1]]) {
    try {
      return { name: codeMatch[1], args: JSON.parse(codeMatch[2]) };
    } catch (e) {
      return { name: codeMatch[1], args: { input: codeMatch[2] } };
    }
  }

  return null;
}

/**
 * Get the system prompt for tool usage
 */
export function getToolSystemPrompt(allowedTools) {
  const toolNames = allowedTools || Object.keys(TOOL_REGISTRY);
  const tools = toolNames.map(name => TOOL_REGISTRY[name]).filter(Boolean);

  if (tools.length === 0) return '';

  let prompt = `\n\n## Available Tools\n\nYou have access to the following tools. Use them by outputting a JSON tool call.\n\n`;

  for (const tool of tools) {
    const schema = tool.schema || {};
    prompt += `### ${schema.name}\n`;
    prompt += `${schema.description || 'No description'}\n\n`;
    if (schema.parameters?.properties) {
      prompt += `Parameters:\n`;
      for (const [key, param] of Object.entries(schema.parameters.properties)) {
        prompt += `  - ${key}: ${param.description || key} (${param.type || 'string'})${param.required ? ' [required]' : ''}\n`;
      }
    }
    prompt += `\n`;
  }

  prompt += `\nTo call a tool, output a JSON object with "name" and "args" fields:\n\`\`\`json\n{"name": "tool_name", "args": { ... }}\n\`\`\`\n\nAfter getting the result, continue your response naturally.\n`;

  return prompt;
}

// Register all built-in tools
registerTool('read', readTool, {
  name: 'read',
  description: 'Read a file from the filesystem. Returns the contents of the file. Use for viewing code, configs, or any text file.',
  parameters: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Absolute path to the file to read', required: true },
      offset: { type: 'number', description: 'Line number to start reading from (1-indexed)' },
      limit: { type: 'number', description: 'Maximum number of lines to read' },
    },
    required: ['filePath'],
  },
});

registerTool('write', writeTool, {
  name: 'write',
  description: 'Write content to a file. Overwrites existing files. Use for creating new files or replacing file contents entirely.',
  parameters: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Absolute path to the file to write', required: true },
      content: { type: 'string', description: 'The content to write to the file', required: true },
    },
    required: ['filePath', 'content'],
  },
});

registerTool('edit', editTool, {
  name: 'edit',
  description: 'Edit a file by replacing specific text. Use for making targeted changes without rewriting the entire file.',
  parameters: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Absolute path to the file to edit', required: true },
      oldString: { type: 'string', description: 'The text to replace', required: true },
      newString: { type: 'string', description: 'The new text to insert', required: true },
      replaceAll: { type: 'boolean', description: 'Replace all occurrences of oldString' },
    },
    required: ['filePath', 'oldString', 'newString'],
  },
});

registerTool('glob', globTool, {
  name: 'glob',
  description: 'Find files by glob pattern. Use for searching for files by name patterns across the project.',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern to match (e.g. "**/*.js", "src/**/*.tsx")', required: true },
      path: { type: 'string', description: 'Directory to search in (defaults to current working directory)' },
    },
    required: ['pattern'],
  },
});

registerTool('grep', grepTool, {
  name: 'grep',
  description: 'Search file contents using regular expressions. Use for finding specific patterns, function definitions, imports, etc.',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search for', required: true },
      path: { type: 'string', description: 'Directory to search in' },
      include: { type: 'string', description: 'File pattern to filter (e.g. "*.js", "*.{ts,tsx}")' },
    },
    required: ['pattern'],
  },
});

registerTool('bash', bashTool, {
  name: 'bash',
  description: 'Execute a shell command. Use for running scripts, building, testing, git operations, and any terminal commands.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The command to execute', required: true },
      workdir: { type: 'string', description: 'Working directory for the command' },
      timeout: { type: 'number', description: 'Timeout in milliseconds' },
    },
    required: ['command'],
  },
});

registerTool('websearch', websearchTool, {
  name: 'websearch',
  description: 'Search the web for information. Use for looking up documentation, APIs, current events, or any online resource.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query', required: true },
      numResults: { type: 'number', description: 'Number of results to return (max 10)' },
    },
    required: ['query'],
  },
});

registerTool('webfetch', webfetchTool, {
  name: 'webfetch',
  description: 'Fetch content from a URL. Use for reading web pages, APIs, or documentation.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to fetch', required: true },
      format: { type: 'string', description: 'Response format: "markdown", "text", or "html"' },
    },
    required: ['url'],
  },
});

registerTool('task', taskTool, {
  name: 'task',
  description: 'Launch a sub-agent to handle a complex subtask autonomously. Use for delegating independent work that can run in parallel.',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Brief description of the subtask', required: true },
      prompt: { type: 'string', description: 'Detailed instructions for the sub-agent', required: true },
    },
    required: ['description', 'prompt'],
  },
});

export default {
  registerTool,
  getTool,
  executeTool,
  listTools,
  getToolSchemas,
  parseToolCall,
  getToolSystemPrompt,
};
