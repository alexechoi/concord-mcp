import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runSetup } from '../../src/cli/commands/setup.js';
import { parseDefaultYes, resolveGlobalPreference } from '../../src/cli/global-preference.js';
import { readPreferences, savePreferences } from '../../src/config/preferences.js';
import { BLOCK_START, removeBlock, upsertBlock } from '../../src/install/block.js';
import {
  globalInstructionTargets,
  installGlobalInstructions,
  removeGlobalInstructions,
} from '../../src/install/global-instructions.js';

function fakeHome(): NodeJS.ProcessEnv {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'concord-home-')));
  return { HOME: home };
}

function repoDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'concord-global-'));
  mkdirSync(join(dir, '.git'));
  return realpathSync(dir);
}

describe('removeBlock', () => {
  it('removes the block and its separating blank line, keeping other content', () => {
    const withBlock = upsertBlock('# Mine\n', 'CONCORD');
    expect(removeBlock(withBlock)).toBe('# Mine\n');
    expect(removeBlock(`${withBlock}after\n`)).toBe('# Mine\nafter\n');
  });

  it('empties a file that held only the block and leaves blockless content alone', () => {
    expect(removeBlock(upsertBlock('', 'CONCORD'))).toBe('');
    expect(removeBlock('# Mine\n')).toBe('# Mine\n');
  });
});

describe('globalInstructionTargets', () => {
  it('honours harness home overrides', () => {
    const targets = globalInstructionTargets({
      HOME: '/home/me',
      CLAUDE_CONFIG_DIR: '/cfg/claude',
      CODEX_HOME: '/cfg/codex',
    });
    expect(targets.map((target) => target.harness)).toEqual([
      'claude-code',
      'codex',
      'gemini',
      'goose',
    ]);
    expect(targets[0]?.path).toBe(join('/cfg/claude', 'CLAUDE.md'));
    expect(targets[1]?.path).toBe(join('/cfg/codex', 'AGENTS.md'));
  });
});

describe('installGlobalInstructions', () => {
  it('writes only harnesses present on the machine, idempotently, keeping user content', () => {
    const env = fakeHome();
    const home = env['HOME'] ?? '';
    mkdirSync(join(home, '.claude'));
    writeFileSync(join(home, '.claude', 'CLAUDE.md'), '# My global rules\n');
    const targets = globalInstructionTargets(env);

    const written = installGlobalInstructions(targets);
    const first = readFileSync(join(home, '.claude', 'CLAUDE.md'), 'utf8');
    installGlobalInstructions(targets);

    expect(written).toEqual([join(home, '.claude', 'CLAUDE.md')]);
    expect(existsSync(join(home, '.codex'))).toBe(false);
    expect(first).toContain('# My global rules');
    expect(first).toContain('concord setup --no-adapters');
    expect(readFileSync(join(home, '.claude', 'CLAUDE.md'), 'utf8')).toBe(first);
  });

  it('removes the block again without touching user content', () => {
    const env = fakeHome();
    const home = env['HOME'] ?? '';
    mkdirSync(join(home, '.gemini'));
    writeFileSync(join(home, '.gemini', 'GEMINI.md'), '# Mine\n');
    const targets = globalInstructionTargets(env);
    installGlobalInstructions(targets);

    expect(removeGlobalInstructions(targets)).toEqual([join(home, '.gemini', 'GEMINI.md')]);
    expect(readFileSync(join(home, '.gemini', 'GEMINI.md'), 'utf8')).toBe('# Mine\n');
    expect(removeGlobalInstructions(targets)).toEqual([]);
  });
});

describe('preferences', () => {
  it('round-trips and merges into ~/.concord/config.json', () => {
    const env = fakeHome();
    expect(readPreferences(env)).toEqual({});
    savePreferences(env, { globalInstructions: true });
    expect(readPreferences(env)).toEqual({ globalInstructions: true });
    expect(existsSync(join(env['HOME'] ?? '', '.concord', 'config.json'))).toBe(true);
  });

  it('treats an unreadable file as unanswered', () => {
    const env = fakeHome();
    mkdirSync(join(env['HOME'] ?? '', '.concord'));
    writeFileSync(join(env['HOME'] ?? '', '.concord', 'config.json'), '{not json');
    expect(readPreferences(env)).toEqual({});
  });
});

describe('resolveGlobalPreference', () => {
  it('asks once on first run and saves the answer', async () => {
    const ask = vi.fn(() => Promise.resolve(true));
    await expect(
      resolveGlobalPreference({ flag: undefined, saved: undefined, ask }),
    ).resolves.toEqual({ enabled: true, save: true });
    expect(ask).toHaveBeenCalledOnce();
  });

  it('reuses a saved answer without asking', async () => {
    const ask = vi.fn(() => Promise.resolve(true));
    await expect(resolveGlobalPreference({ flag: undefined, saved: false, ask })).resolves.toEqual({
      enabled: false,
      save: false,
    });
    expect(ask).not.toHaveBeenCalled();
  });

  it('lets a flag override and replace the saved answer', async () => {
    await expect(
      resolveGlobalPreference({ flag: false, saved: true, ask: undefined }),
    ).resolves.toEqual({ enabled: false, save: true });
  });

  it('decides nothing without a terminal or an answer', async () => {
    await expect(
      resolveGlobalPreference({ flag: undefined, saved: undefined, ask: undefined }),
    ).resolves.toEqual({ enabled: undefined, save: false });
  });

  it('defaults a blank answer to yes', () => {
    expect(parseDefaultYes('')).toBe(true);
    expect(parseDefaultYes(' Y ')).toBe(true);
    expect(parseDefaultYes('n')).toBe(false);
    expect(parseDefaultYes('No')).toBe(false);
  });
});

describe('runSetup with global instructions', () => {
  it('writes, then removes, the machine-wide block only when asked', () => {
    const env = fakeHome();
    const home = env['HOME'] ?? '';
    mkdirSync(join(home, '.claude'));
    const claudeMd = join(home, '.claude', 'CLAUDE.md');
    const dir = repoDir();

    runSetup(dir, { mcp: false, env });
    expect(existsSync(claudeMd)).toBe(false);

    expect(runSetup(dir, { mcp: false, env, globalInstructions: true }).written).toContain(
      claudeMd,
    );
    expect(readFileSync(claudeMd, 'utf8')).toContain(BLOCK_START);

    runSetup(dir, { mcp: false, env, globalInstructions: false });
    expect(readFileSync(claudeMd, 'utf8')).toBe('');
  });
});
