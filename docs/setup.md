# Setup Guide

Get the Cascade Cost Meter running: shared core + headless CLI + the Windsurf
extension. Everything is local; nothing is sent off your machine.

## 1. Prerequisites

- **Node.js 18+** (`node -v`).
- **Windsurf** (the VS Code-based IDE) with Cascade.

## 2. Install and test

```bash
npm install      # dev deps (Vitest, esbuild); js-tiktoken is optional
npm test         # all unit + integration tests should pass
```

Tests never touch your real history — they use a temp `CCM_DATA_DIR`.

## 3. (Optional) seed your own config

A default pricing table is bundled, so this is optional. To customise prices or
settings, copy the templates into the data directory:

```bash
mkdir -p ~/.cascade-cost-meter/pricing
cp config/pricing/pricing.v1.json ~/.cascade-cost-meter/pricing/pricing.v1.json
cp config/settings.example.json    ~/.cascade-cost-meter/settings.json
```

Edit `pricing.v1.json` to match the models you use. If a turn shows
"cost unavailable", add the exact model label from the Cascade model selector as
an `alias`. Prices are **provider list-price estimates**, not Windsurf billing.

## 4. Build and install the extension

```bash
npm run package:ext    # build:ext + zip the .vsix → extension/cascade-cost-meter.vsix
```

In Windsurf: open the Command Palette → **Extensions: Install from VSIX…** →
choose `extension/cascade-cost-meter.vsix`. Reload when prompted. A `≈ $…` item
appears in the status bar.

## 5. Wire up the hook

**Recommended — let the installer do it.** This auto-detects the repo path and
safely merges the entry into your `hooks.json` (backup + idempotent; it won't
touch your other hooks or keys):

```bash
npm run setup            # add --dry-run first to preview, or --print to inspect
```

See `docs/install.md` for what it does and how to recover. Then restart/reload
Windsurf so the hook is picked up.

**Manual fallback.** Edit `~/.codeium/windsurf/hooks.json` (create it if absent)
and add the `post_cascade_response_with_transcript` entry from
`hooks.example.json`, using an **absolute path to both `node` and `bin/hook.js`**:

```json
{
  "version": 1,
  "hooks": {
    "post_cascade_response_with_transcript": [
      { "command": "/opt/homebrew/bin/node \"/ABSOLUTE/PATH/TO/repo/bin/hook.js\"" }
    ]
  }
}
```

> Use an absolute `node` path (find yours with `command -v node`), not a bare
> `node`. Windsurf runs hooks via `bash -c` with a minimal GUI/launchd PATH that
> usually excludes Homebrew/nvm, so a bare `node` would be "command not found"
> and the hook would silently never fire. The installer (`npm run setup`) pins
> this for you.
>
> Confirm the exact `hooks.json` schema against the current docs
> (<https://docs.windsurf.com/windsurf/cascade/hooks>) — field names can change
> between Windsurf versions. Restart/reload Windsurf so the hook is picked up.

## 6. Verify

First run the read-only diagnostic — it prints a single verdict telling you
whether the chain is healthy or exactly where it is stuck:

```bash
npm run doctor
```

Then run a normal Cascade prompt and check:

- An in-IDE notification appears with `Cascade estimate: $… · … in / … out · <model>`.
- The status bar total updates.
- `~/.cascade-cost-meter/usage.jsonl` gains a new line (counts/metadata only).

To watch a single turn flow through end-to-end (and classify it if it doesn't):

```bash
npm run doctor -- --watch    # then send ONE prompt in the Cascade panel
```

Work through `docs/verification-checklist.md` for the full pass, including the
fail-safe and privacy checks.

## 7. Headless use (no extension)

You can run the pipeline directly — useful for testing or scripting:

```bash
cat test/fixtures/with-transcript.json | node bin/cascade-cost-meter.js
# → Cascade estimate: $… · … in / … out · Claude Sonnet 4   (run from the repo root)
```

## Where your data lives

- `~/.cascade-cost-meter/inbox.jsonl` — the hook's event queue (content-free).
- `~/.cascade-cost-meter/usage.jsonl` — your estimated-cost history.
- `~/.cascade-cost-meter/settings.json` / `pricing/` — your overrides.
- `~/.cascade-cost-meter/debug.log` — internal errors (best-effort).

Nothing here is in the repo or synced to the cloud. See `docs/privacy-security.md`.

## Troubleshooting

- **Nothing is ever recorded (the hook never fires):** run `npm run doctor`. If
  `Hook node` reads `[FAIL]`, the hook command can't find `node`. macOS GUI apps
  run hooks via `bash -c` with a minimal PATH that excludes Homebrew/nvm, so a
  bare `node` silently fails. Re-run `npm run setup` (it pins an absolute node
  binary), then **fully restart Windsurf** — quit and reopen, since hooks load at
  startup. Confirm with `npm run doctor -- --watch` + one Cascade prompt.
- **No costs / status bar stuck at $0:** run `npm run doctor`. A `coverage`
  verdict means recent activity used a non-Cascade surface (e.g. the
  Codex/Editor-agent pane), which does not emit the Cascade hook — switch to the
  Cascade panel. Use `npm run doctor -- --watch` to confirm a live turn.
- **No toast / status bar:** open the **Cascade Cost Meter** output channel for
  errors; confirm the extension activated and the hook is firing.
- **"cost unavailable":** the model label isn't in the pricing config — add it as
  a model/alias. In-house SWE-* models have no public price by design.
- **Numbers look off:** they are estimates; input context isn't fully observable.
  See `docs/limitations.md`.
