/**
 * Bash Tool — Execute shell commands.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function bashTool(args) {
  const { command, workdir, timeout } = args;

  if (!command) {
    throw new Error('command is required');
  }

  const cwd = workdir
    ? (path.isAbsolute(workdir) ? workdir : path.resolve(process.cwd(), workdir))
    : process.cwd();

  if (!fs.existsSync(cwd)) {
    throw new Error(`Directory not found: ${cwd}`);
  }

  const execTimeout = timeout || 120000; // default 2 min

  try {
    const startTime = Date.now();
    const output = execSync(command, {
      cwd,
      timeout: execTimeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      encoding: 'utf-8',
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const duration = Date.now() - startTime;

    const result = {
      command,
      exitCode: 0,
      stdout: output || '',
      stderr: '',
      duration,
      cwd,
    };

    // Truncate very long output
    if (result.stdout.length > 50000) {
      result.stdout = result.stdout.slice(0, 50000) +
        `\n\n... [output truncated at 50000 characters, full output length: ${result.stdout.length}]`;
      result.truncated = true;
    }

    return result;
  } catch (err) {
    return {
      command,
      exitCode: err.status || 1,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || 'Command failed',
      duration: 0,
      cwd,
      error: true,
    };
  }
}

export default bashTool;
