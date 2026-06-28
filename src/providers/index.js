/**
 * Provider Registry — Manages all LLM providers.
 * Each provider implements the same interface:
 *   - complete(messages, options) => Promise<{content, usage}>
 *   - stream(messages, options) => AsyncIterable<{type, content}>
 */

import { OpenCodeProvider } from './opencode.js';

const PROVIDER_REGISTRY = {};

/**
 * Register a provider
 */
export function registerProvider(name, providerClass) {
  PROVIDER_REGISTRY[name] = providerClass;
}

/**
 * Get a provider instance
 */
export function getProvider(name, config) {
  const ProviderClass = PROVIDER_REGISTRY[name];
  if (!ProviderClass) {
    throw new Error(`Unknown provider: "${name}". Available: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`);
  }
  return new ProviderClass(config);
}

/**
 * List all registered providers
 */
export function listProviders() {
  return Object.keys(PROVIDER_REGISTRY);
}

/**
 * Check if a provider is available
 */
export function hasProvider(name) {
  return !!PROVIDER_REGISTRY[name];
}

// Register built-in providers
export { OpenCodeProvider } from './opencode.js';

// Register OpenCode as default (always available — uses OpenAI-compatible API)
registerProvider('opencode', OpenCodeProvider);

/**
 * Get API base URL from config or env
 */
export function getApiBase(providerConfig) {
  return providerConfig.api_base || process.env.CRUF_API_BASE || 'https://api.opencode.ai/v1';
}

/**
 * Get API key from config or env
 */
export function getApiKey(providerConfig, envVar) {
  return providerConfig.api_key || process.env[envVar] || '';
}

export default {
  registerProvider,
  getProvider,
  listProviders,
  hasProvider,
  getApiBase,
  getApiKey,
};
