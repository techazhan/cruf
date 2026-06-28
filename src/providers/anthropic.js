/**
 * Anthropic Provider — Uses Anthropic's API directly.
 * Supports Claude models with streaming.
 */

import { getApiKey } from './index.js';

export class AnthropicProvider {
  constructor(config) {
    this.name = 'anthropic';
    this.config = config || {};
    this.apiBase = this.config.api_base || 'https://api.anthropic.com/v1';
    this.apiKey = getApiKey(this.config, 'ANTHROPIC_API_KEY');
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  _convertMessages(messages) {
    const systemMsgs = [];
    const converted = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMsgs.push(msg.content);
      } else if (msg.role === 'user') {
        converted.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        converted.push({ role: 'assistant', content: msg.content });
      }
    }

    return { system: systemMsgs.join('\n\n'), messages: converted };
  }

  _buildBody(messages, options = {}) {
    const { system, messages: converted } = this._convertMessages(messages);
    const body = {
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.max_tokens || 128000,
      messages: converted,
      stream: options.stream ?? false,
    };
    if (system) body.system = system;
    if (options.temperature !== undefined) body.temperature = options.temperature;
    return body;
  }

  async complete(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY env var or configure in .cruf.json');
    }

    const body = this._buildBody(messages, { ...options, stream: false });
    const response = await fetch(`${this.apiBase}/messages`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.map(c => c.text).join('') || '';

    return {
      content,
      role: 'assistant',
      usage: data.usage || {},
      model: data.model || options.model,
      finish_reason: data.stop_reason || 'stop',
    };
  }

  async *stream(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured.');
    }

    const body = this._buildBody(messages, { ...options, stream: true });
    const response = await fetch(`${this.apiBase}/messages`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
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
            const type = parsed.type;

            if (type === 'content_block_delta') {
              if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
                yield { type: 'content', content: parsed.delta.text };
              }
            } else if (type === 'message_stop') {
              yield { type: 'finish', reason: 'stop' };
            }
          } catch (e) { /* skip */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  getModels() {
    return this.config.models || {};
  }
}

export default AnthropicProvider;
