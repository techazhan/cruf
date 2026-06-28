/**
 * Grep Tool — Search file contents using regular expressions.
 */

import fs from 'fs';
import path from 'path';

export async function grepTool(args) {
  const { pattern, path: searchPath, include } = args;

  if (!pattern) {
    throw new Error('pattern is required');
  }

  const rootDir = searchPath
    ? (path.isAbsolute(searchPath) ? searchPath : path.resolve(process.cwd(), searchPath))
    : process.cwd();

  if (!fs.existsSync(rootDir)) {
    throw new Error(`Directory not found: ${rootDir}`);
  }

  const regex = new RegExp(pattern, 'g');
  const results = [];

  // Collect files to search
  const files = collectFiles(rootDir, include);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0;
        if (regex.test(lines[i])) {
          results.push({
            file: file,
            line: i + 1,
            content: lines[i].trim(),
            match: lines[i].match(regex)?.[0] || '',
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  return {
    pattern: pattern.toString(),
    root: rootDir,
    matches: results,
    total: results.length,
    files: [...new Set(results.map(r => r.file))].length,
  };
}

function collectFiles(dir, includePattern) {
  const files = [];
  const includeRegex = includePattern ? new RegExp(includePattern.replace(/\*/g, '.*').replace(/\./g, '\\.')) : null;

  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);

      // Skip node_modules, .git, .cache, etc.
      if (entry === 'node_modules' || entry === '.git' || entry === '.cache' ||
          entry.startsWith('.') && fs.statSync(fullPath).isDirectory()) {
        continue;
      }

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...collectFiles(fullPath, includePattern));
        } else if (stat.isFile()) {
          if (!includeRegex || includeRegex.test(entry)) {
            files.push(fullPath);
          }
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip unreadable */ }

  return files;
}

export default grepTool;
