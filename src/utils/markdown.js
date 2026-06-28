/**
 * Markdown — Render markdown content to terminal.
 * Uses marked for parsing and outputs clean terminal-formatted text.
 */

let marked;

async function loadDeps() {
  if (!marked) {
    marked = await import('marked');
  }
}

/**
 * Strip markdown for terminal display
 */
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
    .replace(/\*(.+?)\*/g, '$1')         // italic
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1') // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // links
    .replace(/!\[(.+?)\]\(.+?\)/g, '$1') // images
    .replace(/>\s+/g, '')               // blockquotes
    .replace(/^-{3,}$/gm, '')           // horizontal rules
    .replace(/\n{3,}/g, '\n\n');        // excessive newlines
}

/**
 * Render markdown to terminal-formatted text
 */
export function render(text, options = {}) {
  const { maxWidth = process.stdout.columns - 4 || 76 } = options;

  if (!text) return '';

  // Simple terminal rendering without rich formatting
  let result = text;

  // Code blocks — preserve indentation
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langTag = lang ? ` [${lang}]` : '';
    const lines = code.split('\n');
    const formatted = lines
      .map(l => `  │ ${l}`)
      .join('\n');
    return `\n${'─'.repeat(Math.min(40, maxWidth - 4))}${langTag}\n${formatted}\n${'─'.repeat(Math.min(40, maxWidth - 4))}\n`;
  });

  // Inline code
  result = result.replace(/`([^`]+)`/g, "'$1'");

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');

  // Italic
  result = result.replace(/\*(.+?)\*\*/g, '$1');

  // Headings
  result = result.replace(/^### (.+)$/gm, '\n  ▸ $1');
  result = result.replace(/^## (.+)$/gm, '\n  ▣ $1');
  result = result.replace(/^# (.+)$/gm, '\n  ■ $1');

  // Lists
  result = result.replace(/^[-*] (.+)$/gm, '  • $1');
  result = result.replace(/^\d+\. (.+)$/gm, '  $1');

  // Blockquotes
  result = result.replace(/^> (.+)$/gm, '  │ $1');

  return result;
}

/**
 * Check if text looks like markdown
 */
export function isMarkdown(text) {
  if (!text) return false;
  return /#{1,6}\s|```|\[.+\]\(.+\)|\*\*|__|~~/.test(text);
}

export default { render, stripMarkdown, isMarkdown };
