/**
 * Config — Configuration management for Cruf.
 * Loads and merges config from multiple sources:
 *   1. Default config (.cruf.json in package)
 *   2. User config (~/.config/cruf/cruf.json or %USERPROFILE%\.config\cruf\cruf.json)
 *   3. Project config (.cruf.json in cwd)
 *   4. Environment variables
 *   5. CLI flags
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Get the default config path
 */
function getDefaultConfigPath() {
  return path.join(PROJECT_ROOT, '.cruf.json');
}

/**
 * Get the user config path
 */
function getUserConfigPath() {
  const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, 'cruf')
    : path.join(os.homedir(), '.config', 'cruf');
  return path.join(configDir, 'cruf.json');
}

/**
 * Get the project config path (in cwd)
 */
function getProjectConfigPath() {
  return path.join(process.cwd(), '.cruf.json');
}

/**
 * Get the legacy config path (opencode compat)
 */
function getLegacyConfigPath() {
  const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, 'opencode')
    : path.join(os.homedir(), '.config', 'opencode');
  return path.join(configDir, 'opencode.jsonc');
}

/**
 * Load a JSON config file safely
 * Handles JSONC (strips comments) without breaking URLs
 */
function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // First try parsing as-is (valid JSON)
      try {
        return JSON.parse(content);
      } catch (jsonError) {
        // If that fails, try stripping comments (JSONC format)
        const cleaned = stripJsonComments(content);
        try {
          return JSON.parse(cleaned);
        } catch (jsoncError) {
          // If both fail, return null silently
          return null;
        }
      }
    }
  } catch (err) {
    // Silently fail for config loading
  }
  return null;
}

/**
 * Strip comments from JSON content without breaking URLs
 */
function stripJsonComments(content) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = null;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1] || '';

    // Handle string boundaries
    if (inString) {
      result += char;
      if (char === '\\') {
        // Escape character — skip next char
        result += content[i + 1] || '';
        i += 2;
        continue;
      }
      if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }

    // Line comment //
    if (char === '/' && nextChar === '/') {
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Block comment /* */
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < content.length) {
        if (content[i] === '*' && content[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Load environment variable overrides
 */
function loadEnvOverrides() {
  const env = {};
  if (process.env.OPENAI_API_KEY) env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (process.env.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (process.env.GOOGLE_API_KEY) env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (process.env.CRUF_API_KEY) env.CRUF_API_KEY = process.env.CRUF_API_KEY;
  if (process.env.CRUF_API_BASE) env.CRUF_API_BASE = process.env.CRUF_API_BASE;
  if (process.env.CRUF_DEFAULT_MODEL) env.CRUF_DEFAULT_MODEL = process.env.CRUF_DEFAULT_MODEL;
  if (process.env.CRUF_DEFAULT_PROVIDER) env.CRUF_DEFAULT_PROVIDER = process.env.CRUF_DEFAULT_PROVIDER;
  return env;
}

/**
 * Apply environment variable overrides to config
 */
function applyEnvOverrides(config, env) {
  if (env.CRUF_API_KEY && config.providers?.opencode) {
    config.providers.opencode.api_key = env.CRUF_API_KEY;
  }
  if (env.CRUF_API_BASE && config.providers?.opencode) {
    config.providers.opencode.api_base = env.CRUF_API_BASE;
  }
  if (env.OPENAI_API_KEY && config.providers?.openai) {
    config.providers.openai.api_key = env.OPENAI_API_KEY;
  }
  if (env.ANTHROPIC_API_KEY && config.providers?.anthropic) {
    config.providers.anthropic.api_key = env.ANTHROPIC_API_KEY;
  }
  if (env.GOOGLE_API_KEY && config.providers?.google) {
    config.providers.google.api_key = env.GOOGLE_API_KEY;
  }
  if (env.CRUF_DEFAULT_MODEL) {
    config.default_model = env.CRUF_DEFAULT_MODEL;
  }
  if (env.CRUF_DEFAULT_PROVIDER) {
    config.default_provider = env.CRUF_DEFAULT_PROVIDER;
  }
  return config;
}

/**
 * Resolve provider and model config
 */
function resolveProviderConfig(config, providerName, modelName) {
  providerName = providerName || config.default_provider || 'opencode';
  modelName = modelName || config.default_model || 'deepseek-v4-flash-free';

  const provider = config.providers?.[providerName];
  if (!provider) {
    throw new Error(`Provider "${providerName}" not found in config. Available: ${Object.keys(config.providers || {}).join(', ')}`);
  }

  const model = provider.models?.[modelName];
  if (!model) {
    throw new Error(`Model "${modelName}" not found for provider "${providerName}". Available: ${Object.keys(provider.models || {}).join(', ')}`);
  }

  return { provider, model, providerName, modelName };
}

/**
 * Load and merge all config sources
 */
export function loadConfig(options = {}) {
  // 1. Start with default config
  let config = loadJsonFile(getDefaultConfigPath()) || {};
  const userConfig = loadJsonFile(getUserConfigPath()) || {};
  const projectConfig = loadJsonFile(getProjectConfigPath()) || {};

  // 1b. Try OpenCode config for backward compatibility
  const legacyConfig = loadJsonFile(getLegacyConfigPath()) || {};

  // 2. Deep merge: default < user < project < legacy (providers only)
  config = deepMerge(config, userConfig);
  config = deepMerge(config, projectConfig);

  // Merge legacy provider configs if they exist
  if (legacyConfig.providers) {
    if (!config.providers) config.providers = {};
    for (const [key, val] of Object.entries(legacyConfig.providers)) {
      if (!config.providers[key]) {
        config.providers[key] = val;
      }
    }
  }

  // Merge legacy agents
  if (legacyConfig.agent) {
    if (!config.agents) config.agents = {};
    for (const [key, val] of Object.entries(legacyConfig.agent)) {
      if (!config.agents[key]) {
        config.agents[key] = {
          ...val,
          description: val.description || `Agent: ${key}`,
        };
      }
    }
  }

  // Remove $schema if present
  delete config.$schema;

  // 3. Apply environment overrides
  const env = loadEnvOverrides();
  applyEnvOverrides(config, env);

  // 4. Apply CLI overrides if provided
  if (options.provider) config.default_provider = options.provider;
  if (options.model) config.default_model = options.model;

  // Set defaults if not present
  config.default_provider = config.default_provider || 'opencode';
  config.default_model = config.default_model || 'deepseek-v4-flash-free';
  config.default_agent = config.default_agent || 'assistant';
  config.providers = config.providers || {};
  config.agents = config.agents || {};
  config.tools = config.tools || {};

  return config;
}

/**
 * Simple deep merge utility — mutates target in place
 */
function deepMerge(target, source) {
  if (!source) return target;
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * Save config to user config dir
 */
export function saveConfig(config) {
  const configPath = getUserConfigPath();
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return configPath;
}

/**
 * Init a new .cruf.json in the current directory
 */
export function initProjectConfig() {
  const targetPath = getProjectConfigPath();
  if (fs.existsSync(targetPath)) {
    throw new Error('.cruf.json already exists in this directory');
  }

  const defaultConfig = loadJsonFile(getDefaultConfigPath());
  fs.writeFileSync(targetPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  return targetPath;
}

/**
 * Show config summary
 */
export function showConfig(config) {
  const { default_provider, default_model, default_agent, providers, agents } = config;

  const lines = [];
  lines.push(`Default Provider: ${default_provider}`);
  lines.push(`Default Model:   ${default_model}`);
  lines.push(`Default Agent:   ${default_agent}`);
  lines.push('');

  // Show providers
  if (providers) {
    lines.push('Providers:');
    for (const [name, p] of Object.entries(providers)) {
      const hasKey = p.api_key ? '✓' : '✗';
      const models = p.models ? Object.keys(p.models).join(', ') : 'none';
      lines.push(`  ${name} [${hasKey}] models: ${models}`);
    }
  }

  // Show agents
  if (agents) {
    lines.push('Agents:');
    for (const [name, a] of Object.entries(agents)) {
      lines.push(`  ${name} — ${a.description || 'No description'}`);
    }
  }

  return lines.join('\n');
}

export default {
  loadConfig,
  saveConfig,
  initProjectConfig,
  showConfig,
  resolveProviderConfig,
};
