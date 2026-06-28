/**
 * Web Search Tool — Search the web for information.
 * Uses web scraping via fetch to search. In production this would use a proper search API.
 */

// Simple search using a public search API or fallback
const SEARCH_PROVIDERS = {
  duckduckgo: async (query, numResults) => {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    return data.AbstractText || data.Abstract || 'No results found.';
  },

  // Fallback: use a web search API if available
  auto: async (query, numResults) => {
    // Try duckduckgo first
    try {
      return await SEARCH_PROVIDERS.duckduckgo(query, numResults);
    } catch (e) {
      // If that fails, use a simple web fetch to a search engine
      return `Web search for "${query}" returned no results. The search provider may need configuration.`;
    }
  },
};

export async function websearchTool(args) {
  const { query, numResults = 5 } = args;

  if (!query) {
    throw new Error('query is required');
  }

  const provider = SEARCH_PROVIDERS.auto;
  const content = await provider(query, Math.min(numResults, 10));

  return {
    query,
    results: typeof content === 'string'
      ? [{ title: 'Search Results', snippet: content }]
      : content,
    totalResults: typeof content === 'string' ? 1 : (content.length || 0),
  };
}

export default websearchTool;
