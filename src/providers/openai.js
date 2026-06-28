/**
 * OpenAI Provider — Uses OpenAI's API directly.
 */

import { getApiKey } from './index.js';

export class OpenAIProvider {
  constructor(config) {
    this.name = 'openai';
    this.config = config || {};
    this.apiBase = this.config.api_base || 'https://api.openai.com/v1';
    this.apiKey = getApiKey(this.config, 'OPENAI_API_KEY');
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  _buildBody(messages, options = {}) {
    return {
      model: options.model || 'gpt-4o',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 128000,
      stream: options.stream ?? false,
    };
  }

  async complete(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY env var or configure in .cruf.json');
    }

    const url = `${this.apiBase}/chat/completions`;
    const body = this._buildBody(messages, { ...options, stream: false });

    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      role: choice?.message?.role || 'assistant',
      usage: data.usage || {},
      model: data.model || options.model,
      finish_reason: choice?.finish_reason || 'stop',
    };
  }

  async *stream(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY env var or configure in .cruf.json');
    }

    const url = `${this.apiBase}/chat/completions`;
    const body = this._buildBody(messages, { ...options, stream: true });

    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
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
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: 'content', content: delta.content };
            }
            if (parsed.choices?.[0]?.finish_reason) {
              yield { type: 'finish', reason: parsed.choices[0].finish_reason };
            }
          } catch (e) { /* skip malformed */ }
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

export default OpenAIProvider;
