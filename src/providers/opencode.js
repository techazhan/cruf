/**
 * OpenCode Provider — OpenAI-compatible API provider.
 * Works with OpenCode API, OpenAI API, or any OpenAI-compatible endpoint.
 * This is the default and most flexible provider.
 */

import { getApiBase, getApiKey } from './index.js';

export class OpenCodeProvider {
  constructor(config) {
    this.name = 'opencode';
    this.config = config || {};
    this.apiBase = getApiBase(this.config);
    this.apiKey = getApiKey(this.config, 'CRUF_API_KEY') || 'no-key-required';
    this.defaultModel = 'deepseek-v4-flash-free';
  }

  /**
   * Build headers for API request
   */
  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'cruf/1.0.0',
    };
  }

  /**
   * Build the request body
   */
  _buildBody(messages, options = {}) {
    const model = options.model || this.defaultModel;
    return {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 64000,
      stream: options.stream ?? false,
      ...(options.extraBody || {}),
    };
  }

  /**
   * Non-streaming completion
   */
  async complete(messages, options = {}) {
    const url = `${this.apiBase}/chat/completions`;
    const body = this._buildBody(messages, { ...options, stream: false });

    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenCode API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      role: choice?.message?.role || 'assistant',
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model: data.model || model,
      finish_reason: choice?.finish_reason || 'stop',
    };
  }

  /**
   * Streaming completion
   * Returns an async generator yielding { type, content } objects
   */
  async *stream(messages, options = {}) {
    const url = `${this.apiBase}/chat/completions`;
    const body = this._buildBody(messages, { ...options, stream: true });

    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenCode API error (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            if (delta?.content) {
              yield { type: 'content', content: delta.content };
            }

            if (delta?.reasoning_content) {
              yield { type: 'reasoning', content: delta.reasoning_content };
            }

            if (choice?.finish_reason) {
              yield { type: 'finish', reason: choice.finish_reason };
            }
          } catch (e) {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if the provider is properly configured
   */
  isConfigured() {
    return !!(this.apiKey);
  }

  /**
   * Get available models from config
   */
  getModels() {
    return this.config.models || {};
  }
}

export default OpenCodeProvider;
