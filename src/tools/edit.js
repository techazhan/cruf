/**
 * Edit Tool — Edit files by replacing specific text.
 */

import fs from 'fs';
import path from 'path';

export async function editTool(args) {
  const { filePath, oldString, newString, replaceAll } = args;

  if (!filePath || oldString === undefined || newString === undefined) {
    throw new Error('filePath, oldString, and newString are required');
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');

  // Count occurrences
  const occurrences = (content.match(new RegExp(escapeRegExp(oldString), 'g')) || []).length;

  if (occurrences === 0) {
    throw new Error(`oldString not found in ${filePath}`);
  }

  let newContent;
  let replacements = 0;

  if (replaceAll) {
    newContent = content.split(oldString).join(newString);
    replacements = occurrences;
  } else {
    if (occurrences > 1) {
      throw new Error(
        `Found ${occurrences} matches for oldString in ${filePath}. ` +
        `Provide more surrounding context in oldString to identify the correct match, or use replaceAll.`
      );
    }
    newContent = content.replace(oldString, newString);
    replacements = 1;
  }

  fs.writeFileSync(resolvedPath, newContent, 'utf-8');

  return {
    path: resolvedPath,
    replacements,
    totalOccurrences: occurrences,
    newSize: Buffer.byteLength(newContent, 'utf-8'),
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default editTool;
