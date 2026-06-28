/**
 * Write Tool — Write content to files.
 */

import fs from 'fs';
import path from 'path';

export async function writeTool(args) {
  const { filePath, content } = args;

  if (!filePath || content === undefined) {
    throw new Error('filePath and content are required');
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  // Create parent directories if they don't exist
  const parentDir = path.dirname(resolvedPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Check if file exists
  const exists = fs.existsSync(resolvedPath);
  const oldSize = exists ? fs.statSync(resolvedPath).size : 0;

  // Write the file
  fs.writeFileSync(resolvedPath, content, 'utf-8');
  const newSize = Buffer.byteLength(content, 'utf-8');

  return {
    path: resolvedPath,
    action: exists ? 'overwritten' : 'created',
    size: newSize,
    oldSize: exists ? oldSize : 0,
    lines: content.split('\n').length,
  };
}

export default writeTool;
