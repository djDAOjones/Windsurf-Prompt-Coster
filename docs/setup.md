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

Edit `~/.codeium/windsurf/hooks.json` (create it if absent) and add the
`post_cascade_response_with_transcript` entry from `hooks.example.json`, using an
**absolute path** to `bin/hook.js`:

```json
{
  "version": 1,
  "hooks": {
    "post_cascade_response_with_transcript": [
      { "command": "node \"/ABSOLUTE/PATH/TO/repo/bin/hook.js\"" }
    ]
  }
}
```

> Confirm the exact `hooks.json` schema against the current docs
> (<https://docs.windsurf.com/windsurf/cascade/hooks>) — field names can change
> between Windsurf versions. Restart/reload Windsurf so the hook is picked up.

## 6. Verify

Run a normal Cascade prompt, then check:

- An in-IDE notification appears with `Cascade estimate: $… · … in / … out · <model>`.
- The status bar total updates.
- `~/.cascade-cost-meter/usage.jsonl` gains a new line (counts/metadata only).

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

- **No toast / status bar:** open the **Cascade Cost Meter** output channel for
  errors; confirm the extension activated and the hook is firing.
- **"cost unavailable":** the model label isn't in the pricing config — add it as
  a model/alias. In-house SWE-* models have no public price by design.
- **Numbers look off:** they are estimates; input context isn't fully observable.
  See `docs/limitations.md`.
