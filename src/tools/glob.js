/**
 * Glob Tool — Find files by glob pattern.
 */

import fs from 'fs';
import path from 'path';

/**
 * Simple glob implementation (recursive directory walk with pattern matching)
 */
function globSync(pattern, rootDir) {
  const results = [];
  const parts = pattern.split(/[\\/]/);
  const hasRecursive = parts.includes('**');

  function walk(dir, patterns, idx) {
    if (idx >= patterns.length) {
      results.push(dir);
      return;
    }

    const part = patterns[idx];

    if (part === '**') {
      // Match everything recursively
      walk(dir, patterns, idx + 1); // Zero directories
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, patterns, idx); // Continue matching **
            walk(fullPath, patterns, idx + 1); // Try next pattern
          }
        }
      } catch (e) { /* skip unreadable */ }
    } else {
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          if (matchGlobPart(entry, part)) {
            const fullPath = path.join(dir, entry);
            if (idx === patterns.length - 1) {
              results.push(fullPath);
            } else if (fs.statSync(fullPath).isDirectory()) {
              walk(fullPath, patterns, idx + 1);
            }
          }
        }
      } catch (e) { /* skip unreadable */ }
    }
  }

  walk(rootDir, parts, 0);
  return results;
}

function matchGlobPart(name, pattern) {
  // Simple glob matching: *, ?, {a,b}
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\{([^}]+)\}/g, (_, group) => `(${group.split(',').join('|')})`);
  return new RegExp(`^${regexStr}$`).test(name);
}

export async function globTool(args) {
  const { pattern, path: searchPath } = args;

  if (!pattern) {
    throw new Error('pattern is required');
  }

  const rootDir = searchPath
    ? (path.isAbsolute(searchPath) ? searchPath : path.resolve(process.cwd(), searchPath))
    : process.cwd();

  if (!fs.existsSync(rootDir)) {
    throw new Error(`Directory not found: ${rootDir}`);
  }

  const results = globSync(pattern, rootDir);

  return {
    pattern,
    root: rootDir,
    files: results,
    total: results.length,
  };
}

export default globTool;
