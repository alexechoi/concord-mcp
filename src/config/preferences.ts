import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { z } from 'zod';

import { userHome } from './paths.js';

const preferencesSchema = z
  .object({
    /** Whether Concord instructions belong in each harness's machine-wide config. */
    globalInstructions: z.boolean().optional(),
  })
  .loose();

/** Machine-wide answers to `concord setup` questions, asked once per machine. */
export type Preferences = z.infer<typeof preferencesSchema>;

export function preferencesPath(env: NodeJS.ProcessEnv): string {
  return join(userHome(env), '.concord', 'config.json');
}

/** Saved preferences; a missing, empty, or unreadable file counts as unanswered. */
export function readPreferences(env: NodeJS.ProcessEnv): Preferences {
  const path = preferencesPath(env);
  if (!existsSync(path)) return {};
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return preferencesSchema.parse(raw);
  } catch {
    return {};
  }
}

/** Merge `update` into the saved preferences, keeping unrelated keys. */
export function savePreferences(env: NodeJS.ProcessEnv, update: Preferences): void {
  const path = preferencesPath(env);
  mkdirSync(dirname(path), { recursive: true });
  const next = { ...readPreferences(env), ...update };
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
}
