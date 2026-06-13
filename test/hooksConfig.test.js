import { describe, it, expect, afterEach } from 'vitest';
import {
  HOOK_EVENT,
  MalformedHooksError,
  buildHookCommand,
  isOurCommand,
  parseHooksJson,
  serializeHooksJson,
  mergeHookEntry,
} from '../src/config/hooksConfig.js';
import { windsurfHooksFile } from '../src/config/paths.js';

const CMD = 'node "/repo/bin/hook.js"';

describe('buildHookCommand', () => {
  it('quotes the absolute path (spaces / OneDrive safe)', () => {
    const cmd = buildHookCommand('/Users/joe/One Drive/AI credit display');
    expect(cmd).toBe('node "/Users/joe/One Drive/AI credit display/bin/hook.js"');
  });

  it('pins an absolute node binary when one is supplied', () => {
    const cmd = buildHookCommand('/repo', '/opt/homebrew/bin/node');
    expect(cmd).toBe('/opt/homebrew/bin/node "/repo/bin/hook.js"');
  });

  it('quotes the node binary when its path contains spaces', () => {
    const cmd = buildHookCommand('/repo', '/Users/joe/n v/bin/node');
    expect(cmd).toBe('"/Users/joe/n v/bin/node" "/repo/bin/hook.js"');
  });
});

describe('isOurCommand', () => {
  it('matches our hook command on POSIX and Windows separators', () => {
    expect(isOurCommand('node "/repo/bin/hook.js"')).toBe(true);
    expect(isOurCommand('node "C:\\repo\\bin\\hook.js"')).toBe(true);
    expect(isOurCommand('node "/repo/bin/cascade-cost-meter.js"')).toBe(false);
    expect(isOurCommand(undefined)).toBe(false);
  });
});

describe('parseHooksJson', () => {
  it('treats empty / whitespace as no config (null)', () => {
    expect(parseHooksJson('')).toBeNull();
    expect(parseHooksJson('   \n')).toBeNull();
  });

  it('parses a valid object', () => {
    expect(parseHooksJson('{"version":1}')).toEqual({ version: 1 });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseHooksJson('{ not json')).toThrow(MalformedHooksError);
  });

  it('throws on a non-object top level (array)', () => {
    expect(() => parseHooksJson('[]')).toThrow(MalformedHooksError);
  });
});

describe('mergeHookEntry', () => {
  it('creates a fresh config when none exists', () => {
    const { next, action, previousCommand } = mergeHookEntry(null, CMD);
    expect(action).toBe('created');
    expect(previousCommand).toBeNull();
    expect(next).toEqual({ version: 1, hooks: { [HOOK_EVENT]: [{ command: CMD }] } });
  });

  it('adds our entry while preserving other hooks and unknown keys', () => {
    const existing = {
      version: 1,
      somethingCustom: { keep: true },
      hooks: {
        pre_cascade: [{ command: 'echo hi' }],
        [HOOK_EVENT]: [{ command: 'node "/other/tool.js"' }],
      },
    };
    const { next, action } = mergeHookEntry(existing, CMD);
    expect(action).toBe('added');
    expect(next.somethingCustom).toEqual({ keep: true });
    expect(next.hooks.pre_cascade).toEqual([{ command: 'echo hi' }]);
    expect(next.hooks[HOOK_EVENT]).toEqual([
      { command: 'node "/other/tool.js"' },
      { command: CMD },
    ]);
    // Input is not mutated.
    expect(existing.hooks[HOOK_EVENT]).toHaveLength(1);
  });

  it('is idempotent: re-running reports alreadyPresent and changes nothing', () => {
    const once = mergeHookEntry(null, CMD).next;
    const { next, action } = mergeHookEntry(once, CMD);
    expect(action).toBe('alreadyPresent');
    expect(next).toEqual(once);
  });

  it('updates a stale entry (our command at a different path) in place', () => {
    const existing = {
      version: 1,
      hooks: { [HOOK_EVENT]: [{ command: 'node "/old/path/bin/hook.js"' }] },
    };
    const { next, action, previousCommand } = mergeHookEntry(existing, CMD);
    expect(action).toBe('updated');
    expect(previousCommand).toBe('node "/old/path/bin/hook.js"');
    expect(next.hooks[HOOK_EVENT]).toEqual([{ command: CMD }]);
  });

  it('collapses accidental duplicates of our entry to one', () => {
    const existing = {
      version: 1,
      hooks: {
        [HOOK_EVENT]: [
          { command: 'node "/old/bin/hook.js"' },
          { command: 'keep me' },
          { command: 'node "/older/bin/hook.js"' },
        ],
      },
    };
    const { next, action } = mergeHookEntry(existing, CMD);
    expect(action).toBe('updated');
    const ours = next.hooks[HOOK_EVENT].filter((e) => isOurCommand(e.command));
    expect(ours).toEqual([{ command: CMD }]);
    expect(next.hooks[HOOK_EVENT]).toContainEqual({ command: 'keep me' });
  });

  it('preserves an existing top-level version instead of overwriting it', () => {
    const { next } = mergeHookEntry({ version: 2, hooks: {} }, CMD);
    expect(next.version).toBe(2);
  });

  it('refuses to merge when the top level is not an object', () => {
    expect(() => mergeHookEntry([], CMD)).toThrow(MalformedHooksError);
  });

  it('refuses to merge when "hooks" is not an object', () => {
    expect(() => mergeHookEntry({ hooks: 'nope' }, CMD)).toThrow(MalformedHooksError);
  });

  it('refuses to merge when our event list is not an array', () => {
    expect(() => mergeHookEntry({ hooks: { [HOOK_EVENT]: {} } }, CMD)).toThrow(MalformedHooksError);
  });
});

describe('serializeHooksJson', () => {
  it('uses 2-space indent and a trailing newline, and round-trips', () => {
    const cfg = mergeHookEntry(null, CMD).next;
    const text = serializeHooksJson(cfg);
    expect(text.startsWith('{\n  "version": 1')).toBe(true);
    expect(text.endsWith('}\n')).toBe(true);
    expect(parseHooksJson(text)).toEqual(cfg);
  });
});

describe('windsurfHooksFile', () => {
  afterEach(() => {
    delete process.env.CCM_WINDSURF_HOOKS;
  });

  it('defaults to ~/.codeium/windsurf/hooks.json', () => {
    delete process.env.CCM_WINDSURF_HOOKS;
    expect(windsurfHooksFile().replace(/\\/g, '/')).toMatch(/\/\.codeium\/windsurf\/hooks\.json$/);
  });

  it('honours the CCM_WINDSURF_HOOKS override', () => {
    process.env.CCM_WINDSURF_HOOKS = '/tmp/custom/hooks.json';
    expect(windsurfHooksFile()).toBe('/tmp/custom/hooks.json');
  });
});
