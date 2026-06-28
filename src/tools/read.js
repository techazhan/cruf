/**
 * Read Tool — Read files from the filesystem.
 */

import fs from 'fs';
import path from 'path';

export async function readTool(args) {
  const { filePath, offset, limit } = args;

  if (!filePath) {
    throw new Error('filePath is required');
  }

  // Resolve relative paths
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    // Read directory contents
    const entries = fs.readdirSync(resolvedPath);
    const listing = entries.map(e => {
      const fullPath = path.join(resolvedPath, e);
      const isDir = fs.statSync(fullPath).isDirectory();
      return `${e}${isDir ? '/' : ''}`;
    });
    return {
      path: resolvedPath,
      type: 'directory',
      entries: listing,
      total: listing.length,
    };
  }

  // Read file contents
  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  let startLine = offset || 1;
  let endLine = limit ? startLine + limit - 1 : totalLines;

  // Clamp
  startLine = Math.max(1, startLine);
  endLine = Math.min(totalLines, endLine);

  const selectedLines = lines.slice(startLine - 1, endLine);
  const result = selectedLines.map((line, i) => `${startLine + i}: ${line}`).join('\n');

  return {
    path: resolvedPath,
    type: 'file',
    size: Buffer.byteLength(content, 'utf-8'),
    totalLines,
    startLine,
    endLine,
    content: result,
    truncated: endLine < totalLines,
  };
}

export default readTool;
