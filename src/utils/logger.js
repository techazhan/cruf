/**
 * Logger — Beautiful terminal output for Cruf.
 * Provides colored, structured logging with themes.
 */

let chalk = null;
let stripAnsi = null;
let depsLoaded = false;

async function loadDeps() {
  if (depsLoaded) return;
  try {
    if (!chalk) {
      const chalkMod = await import('chalk');
      chalk = chalkMod.default || chalkMod;
    }
    if (!stripAnsi) {
      const saMod = await import('strip-ansi');
      stripAnsi = saMod.default || saMod;
    }
    depsLoaded = true;
  } catch (e) {
    // Silently fall back to plain text
  }
}

// Start loading deps immediately but don't block
loadDeps();

const THEMES = {
  dark: {
    primary: '#00d4aa',
    secondary: '#7c3aed',
    accent: '#f59e0b',
    error: '#ef4444',
    success: '#22c55e',
    muted: '#6b7280',
    info: '#3b82f6',
    warning: '#f59e0b',
    text: '#e5e7eb',
    dim: '#4b5563',
    bg: '#111827',
    border: '#1f2937',
  },
  light: {
    primary: '#059669',
    secondary: '#7c3aed',
    accent: '#d97706',
    error: '#dc2626',
    success: '#16a34a',
    muted: '#9ca3af',
    info: '#2563eb',
    warning: '#d97706',
    text: '#1f2937',
    dim: '#9ca3af',
    bg: '#ffffff',
    border: '#e5e7eb',
  },
};

let theme = THEMES.dark;

export function setTheme(name) {
  theme = THEMES[name] || THEMES.dark;
}

export function getTheme() {
  return theme;
}

function style(hex) {
  if (chalk && typeof chalk.hex === 'function') {
    return chalk.hex(hex);
  }
  // Fallback function that returns the string as-is with chainable methods
  const fn = (str) => str;
  fn.bold = fn;
  fn.dim = fn;
  fn.italic = fn;
  fn.underline = fn;
  return fn;
}

function strLen(str) {
  if (stripAnsi && typeof stripAnsi === 'function') {
    try { return stripAnsi(str).length; } catch (e) { /* fall through */ }
  }
  return str.length;
}

/**
 * Print a branded header
 */
export function header(text) {
  const s = style(theme.primary);
  const line = '═'.repeat(Math.min(60, process.stdout.columns - 2 || 58));
  console.log('');
  console.log(s(`  ╔${line}╗`));
  console.log(s(`  ║`) + `  ${chalk ? chalk.bold(text) : text}`.padEnd(line.length + 1) + s(`║`));
  console.log(s(`  ╚${line}╝`));
  console.log('');
}

/**
 * Print a section divider
 */
export function divider(text) {
  const s = style(theme.muted);
  const line = '─'.repeat(Math.min(40, process.stdout.columns - 4 || 38));
  if (text) {
    console.log(s(`  ${line} ${text} ${line}`));
  } else {
    console.log(s(`  ${line}${line}${line}`));
  }
}

/**
 * Print a status/info message
 */
export function info(...args) {
  const s = style(theme.info);
  console.log(s('  ℹ'), ...args);
}

/**
 * Print a success message
 */
export function success(...args) {
  const s = style(theme.success);
  console.log(s('  ✔'), ...args);
}

/**
 * Print a warning message
 */
export function warn(...args) {
  const s = style(theme.warning);
  console.log(s('  ⚠'), ...args);
}

/**
 * Print an error message
 */
export function error(...args) {
  const s = style(theme.error);
  console.log(s('  ✘'), ...args);
}

/**
 * Print a debug message (only shown with --debug)
 */
export function debug(...args) {
  if (process.env.CRUF_DEBUG || process.argv.includes('--debug')) {
    const s = style(theme.muted);
    console.log(s('  ▸'), ...args);
  }
}

/**
 * Print raw text with primary coloring
 */
export function primary(...args) {
  const s = style(theme.primary);
  console.log(s(...args));
}

/**
 * Print a tool call header
 */
export function toolCall(name, args) {
  const s = style(theme.accent);
  const label = chalk ? chalk.bold(`  ⚡ ${name}`) : `  ⚡ ${name}`;
  const argsStr = args ? ` ${JSON.stringify(args)}` : '';
  console.log(`${label}${style(theme.muted)(argsStr)}`);
}

/**
 * Print a thinking indicator
 */
export function thinkingStart() {
  process.stdout.write(style(theme.muted)('  ◌ thinking...\r'));
}

export function thinkingEnd() {
  process.stdout.write(' '.repeat(20) + '\r');
}

/**
 * Print assistant response
 */
export function assistant(msg) {
  const label = chalk ? chalk.hex(theme.primary).bold('  Cruf ›') : '  Cruf ›';
  console.log(`\n${label}\n`);
  // msg should be rendered through markdown
  console.log(msg);
  console.log('');
}

/**
 * Print user prompt echo
 */
export function user(msg) {
  const label = chalk ? chalk.hex(theme.secondary).bold('  You ›') : '  You ›';
  console.log(`\n${label} ${msg}`);
}

/**
 * Print a table
 */
export function table(rows, headers) {
  if (!rows || rows.length === 0) return;

  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const maxVal = Math.max(...rows.map(r => strLen(String(r[i] || ''))));
    return Math.max(strLen(h), maxVal) + 2;
  });

  // Print header
  const s = style(theme.primary);
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('');
  console.log(s(`  ${headerLine}`));
  console.log(s(`  ${'─'.repeat(headerLine.length)}`));

  // Print rows
  for (const row of rows) {
    const line = row.map((cell, i) => String(cell).padEnd(colWidths[i])).join('');
    console.log(`  ${line}`);
  }
  console.log('');
}

/**
 * Print a labeled value
 */
export function label(label, value) {
  const s = style(theme.muted);
  console.log(`  ${s(label)}: ${value}`);
}

/**
 * Format bytes into human-readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default {
  setTheme,
  getTheme,
  header,
  divider,
  info,
  success,
  warn,
  error,
  debug,
  primary,
  toolCall,
  thinkingStart,
  thinkingEnd,
  assistant,
  user,
  table,
  label,
  formatBytes,
};
