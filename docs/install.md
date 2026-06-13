# Install the hook (automated)

The one fiddly setup step is wiring the Cascade hook into Windsurf's
`hooks.json`. This command does it for you — safely — so you don't have to edit
JSON or paste an absolute path by hand.

```bash
npm run setup
```

That's it. Fully restart Windsurf (quit and reopen — hooks load at startup), run
a Cascade prompt, and you're done. The rest of this page explains what it does
and how to recover if anything looks off.

## What it does

1. **Detects this repo's absolute path** automatically (no `ABSOLUTE_PATH_TO_REPO`
   to fill in), and builds an `<absolute-node> "…/bin/hook.js"` command — paths
   quoted as needed. It pins an **absolute node path** (not a bare `node`) because
   Windsurf runs hooks via `bash -c` with a minimal GUI PATH that excludes
   Homebrew/nvm, so a bare `node` would be "command not found" and never fire.
2. **Finds your hooks file** at `~/.codeium/windsurf/hooks.json` (creating it if
   it doesn't exist).
3. **Merges in one entry** for `post_cascade_response_with_transcript` —
   preserving your `version`, any other hooks, and every other key.
4. **Backs up** the original to `hooks.json.bak-<timestamp>`, then writes
   atomically (temp file + rename), so the file is never left half-written.

It is **safe to re-run**: if the hook is already wired it reports
`already configured` and changes nothing. If the path changed (e.g. you moved
the repo), re-running updates the entry in place.

## Preview first (optional)

```bash
npm run setup -- --dry-run    # show the merged result; write nothing
npm run setup -- --print      # print just the merged hooks.json (pipeable)
```

## Verify

Run `npm run doctor` (read-only) for a one-line verdict on whether the hook is
wired and firing. Then run a normal Cascade prompt and check:

- `~/.cascade-cost-meter/inbox.jsonl` gains a line — this proves the **hook
  fired** (it runs even without the extension).
- If the extension `.vsix` is installed: `~/.cascade-cost-meter/usage.jsonl`
  gains a line (counts/metadata only) and the status-bar total updates.

If nothing appears, run `npm run doctor -- --watch` and send one prompt in the
Cascade panel — it classifies whether the hook fired, the bridge consumed it, or
you were using a different AI surface. For the full pass, see
`docs/verification-checklist.md`.

## If it refuses to change your config

If your existing `hooks.json` isn't valid JSON (or has an unexpected shape), the
command **stops without writing** and prints the exact entry to add by hand. Fix
the JSON and re-run, or paste the printed snippet into your file yourself.

## Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Show what would change; write nothing. |
| `--print` | Print the merged `hooks.json` to stdout and exit. |
| `--hooks-file P` | Target a specific file instead of the default path. |
| `--help` | Show usage. |

## Removing the hook

Open `~/.codeium/windsurf/hooks.json` and delete the
`post_cascade_response_with_transcript` entry whose command points at this
repo's `bin/hook.js` (or restore a `.bak-*` backup). Reload Windsurf.

> The hook schema can change between Windsurf versions. Confirm against the
> current docs (<https://docs.windsurf.com/windsurf/cascade/hooks>) if a turn
> never produces a usage line.
