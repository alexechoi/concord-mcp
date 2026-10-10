import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { userHome } from '../config/paths.js';
import { removeBlock, upsertBlock } from './block.js';
import { gooseConfigPath } from './goose-config.js';
import { GLOBAL_CONCORD_INSTRUCTIONS } from './instructions.js';

/** A harness's machine-wide instruction file, read in every repository. */
export interface GlobalInstructionTarget {
  harness: string;
  path: string;
}

function configured(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value === '' ? undefined : value;
}

/**
 * The global instruction file of each harness that has one. Cursor and Grok
 * are absent: their user-level rules live in app settings, not in a file.
 */
export function globalInstructionTargets(env: NodeJS.ProcessEnv): GlobalInstructionTarget[] {
  const home = userHome(env);
  return [
    {
      harness: 'claude-code',
      path: join(configured(env, 'CLAUDE_CONFIG_DIR') ?? join(home, '.claude'), 'CLAUDE.md'),
    },
    {
      harness: 'codex',
      path: join(configured(env, 'CODEX_HOME') ?? join(home, '.codex'), 'AGENTS.md'),
    },
    { harness: 'gemini', path: join(home, '.gemini', 'GEMINI.md') },
    { harness: 'goose', path: join(dirname(gooseConfigPath(env)), '.goosehints') },
  ];
}

/**
 * Write Concord's machine-wide block into each harness whose config directory
 * exists, keeping the rest of the file. Harnesses not on this machine are
 * skipped rather than given a directory. Returns the paths written.
 */
export function installGlobalInstructions(targets: readonly GlobalInstructionTarget[]): string[] {
  const written: string[] = [];
  for (const target of targets) {
    if (!existsSync(dirname(target.path))) continue;
    const existing = existsSync(target.path) ? readFileSync(target.path, 'utf8') : '';
    const updated = upsertBlock(existing, GLOBAL_CONCORD_INSTRUCTIONS);
    if (updated !== existing) writeFileSync(target.path, updated);
    written.push(target.path);
  }
  return written;
}

/** Remove Concord's machine-wide block from each target. Returns the paths changed. */
export function removeGlobalInstructions(targets: readonly GlobalInstructionTarget[]): string[] {
  const removed: string[] = [];
  for (const target of targets) {
    if (!existsSync(target.path)) continue;
    const existing = readFileSync(target.path, 'utf8');
    const updated = removeBlock(existing);
    if (updated === existing) continue;
    writeFileSync(target.path, updated);
    removed.push(target.path);
  }
  return removed;
}
