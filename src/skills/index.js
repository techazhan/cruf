/**
 * Skills — Skill/plugin system for Cruf.
 * Skills are predefined prompt templates and tool configurations
 * for specialized tasks (design, branding, code review, etc.)
 */

import fs from 'fs';
import path from 'path';

/**
 * Load a skill from file
 */
export function loadSkill(skillPath) {
  const resolvedPath = path.isAbsolute(skillPath)
    ? skillPath
    : path.resolve(process.cwd(), skillPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Skill not found: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    // Look for SKILL.md or skill.json in the directory
    const skillMdPath = path.join(resolvedPath, 'SKILL.md');
    const skillJsonPath = path.join(resolvedPath, 'skill.json');

    if (fs.existsSync(skillMdPath)) {
      return {
        type: 'markdown',
        content: fs.readFileSync(skillMdPath, 'utf-8'),
        path: skillMdPath,
      };
    } else if (fs.existsSync(skillJsonPath)) {
      return {
        type: 'json',
        content: JSON.parse(fs.readFileSync(skillJsonPath, 'utf-8')),
        path: skillJsonPath,
      };
    }
    return {
      type: 'directory',
      content: fs.readdirSync(resolvedPath),
      path: resolvedPath,
    };
  }

  if (stat.isFile()) {
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext === '.md' || ext === '.txt') {
      return {
        type: 'markdown',
        content: fs.readFileSync(resolvedPath, 'utf-8'),
        path: resolvedPath,
      };
    } else if (ext === '.json' || ext === '.jsonc') {
      const raw = fs.readFileSync(resolvedPath, 'utf-8');
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      return {
        type: 'json',
        content: JSON.parse(cleaned),
        path: resolvedPath,
      };
    }
  }

  return {
    type: 'unknown',
    content: null,
    path: resolvedPath,
  };
}

/**
 * Register a skill from the skills directory
 */
export function findSkills(skillsDir) {
  const dir = skillsDir || path.join(process.cwd(), '.agents', 'skills');
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir);
  const skills = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      const skillMd = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        skills.push({
          name: entry,
          type: 'skill',
          path: fullPath,
          description: extractDescription(fs.readFileSync(skillMd, 'utf-8')),
        });
      } else {
        skills.push({
          name: entry,
          type: 'directory',
          path: fullPath,
        });
      }
    }
  }

  return skills;
}

function extractDescription(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      return trimmed.substring(0, 120);
    }
  }
  return 'No description';
}

export default { loadSkill, findSkills };
