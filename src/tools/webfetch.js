/**
 * Web Fetch Tool — Fetch content from URLs.
 */

export async function webfetchTool(args) {
  const { url, format = 'markdown' } = args;

  if (!url) {
    throw new Error('url is required');
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:') {
      parsedUrl.protocol = 'https:';
    }
  } catch (e) {
    throw new Error(`Invalid URL: ${url}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Cruf/1.0 (Terminal AI Assistant)',
        'Accept': format === 'html' ? 'text/html' : 'text/plain, text/markdown',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    }

    let content;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      content = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    } else {
      content = await response.text();
    }

    // Truncate very long content
    const MAX_LENGTH = 100000;
    const truncated = content.length > MAX_LENGTH;
    if (truncated) {
      content = content.slice(0, MAX_LENGTH) + `\n\n... [content truncated at ${MAX_LENGTH} characters]`;
    }

    return {
      url: parsedUrl.toString(),
      status: response.status,
      contentType,
      content,
      length: content.length,
      truncated,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default webfetchTool;
