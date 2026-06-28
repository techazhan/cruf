/**
 * Google Provider — Uses Google Gemini API.
 * Supports Gemini models with streaming.
 */

import { getApiKey } from './index.js';

export class GoogleProvider {
  constructor(config) {
    this.name = 'google';
    this.config = config || {};
    this.apiBase = this.config.api_base || 'https://generativelanguage.googleapis.com/v1beta';
    this.apiKey = getApiKey(this.config, 'GOOGLE_API_KEY');
  }

  _convertMessages(messages) {
    const contents = [];
    const systemInstruction = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction.push(msg.content);
      } else if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    return { systemInstruction: systemInstruction.join('\n\n'), contents };
  }

  _buildBody(messages, options = {}) {
    const { systemInstruction, contents } = this._convertMessages(messages);
    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.max_tokens ?? 128000,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    return body;
  }

  async complete(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Google API key not configured. Set GOOGLE_API_KEY env var or configure in .cruf.json');
    }

    const model = options.model || 'gemini-2.5-pro';
    const url = `${this.apiBase}/models/${model}:generateContent?key=${this.apiKey}`;
    const body = this._buildBody(messages, options);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';

    return {
      content: text,
      role: 'assistant',
      usage: data.usageMetadata || {},
      model: model,
      finish_reason: data.candidates?.[0]?.finishReason || 'stop',
    };
  }

  async *stream(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Google API key not configured.');
    }

    const model = options.model || 'gemini-2.5-pro';
    const url = `${this.apiBase}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const body = this._buildBody(messages, options);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google API error (${response.status}): ${errorText}`);
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

          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
            if (text) {
              yield { type: 'content', content: text };
            }
            if (parsed.candidates?.[0]?.finishReason) {
              yield { type: 'finish', reason: parsed.candidates[0].finishReason };
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

export default GoogleProvider;
