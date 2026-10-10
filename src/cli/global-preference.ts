import { createInterface } from 'node:readline/promises';

/** Asked on the first interactive `concord setup` on a machine. */
export const GLOBAL_INSTRUCTIONS_PROMPT =
  'Do you want Concord agents to try and use Concord even in repos where it is not set up? [Y/n] ';

export interface GlobalPreferenceInput {
  /** `--global-instructions` / `--no-global-instructions`, when passed. */
  flag: boolean | undefined;
  /** The answer saved by an earlier setup on this machine. */
  saved: boolean | undefined;
  /** Asks the user; absent when setup is not running in a terminal. */
  ask: (() => Promise<boolean>) | undefined;
}

export interface GlobalPreference {
  /** Undefined when no answer exists yet: setup then leaves global files alone. */
  enabled: boolean | undefined;
  /** True when `enabled` is a new answer that should be saved. */
  save: boolean;
}

/**
 * Whether setup installs machine-wide instructions: an explicit flag wins, then
 * the saved answer, then a first-run question that defaults to yes. Without a
 * terminal nothing is asked or saved, so a person is still asked later.
 */
export async function resolveGlobalPreference(
  input: GlobalPreferenceInput,
): Promise<GlobalPreference> {
  if (input.flag !== undefined) return { enabled: input.flag, save: input.flag !== input.saved };
  if (input.saved !== undefined) return { enabled: input.saved, save: false };
  if (input.ask === undefined) return { enabled: undefined, save: false };
  return { enabled: await input.ask(), save: true };
}

/** A `[Y/n]` answer: only an explicit no declines. */
export function parseDefaultYes(answer: string): boolean {
  return !/^(?:n|no)$/iu.test(answer.trim());
}

export async function askGlobalInstructions(): Promise<boolean> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return parseDefaultYes(await prompt.question(GLOBAL_INSTRUCTIONS_PROMPT));
  } finally {
    prompt.close();
  }
}
