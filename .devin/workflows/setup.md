---
description: Wire the Cascade Cost Meter hook into Windsurf and verify it
---

# Set up Cascade Cost Meter

Walk the user through wiring the post-response hook and verifying the loop. Keep
it brief. The installer (`bin/install.js`) is safe: it auto-detects the repo
path, backs up the existing config, merges without touching the user's other
hooks or keys, and is idempotent (re-running is fine).

1. Confirm Node 18+ is available: `node -v`.

// turbo
2. Preview the change without writing anything: `npm run setup -- --dry-run`.
   Show the user the target path and the merged `hooks.json` it would produce.

3. Apply it: `npm run setup`. This edits the user's real
   `~/.codeium/windsurf/hooks.json` (after backing it up), so let them approve
   the command. If it prints "Refusing to modify…", the existing file isn't
   valid JSON — stop, help the user fix it, then re-run. Never hand-edit their
   config blindly.

4. Ask the user to reload or restart Windsurf so the hook is picked up.

5. Optional (for the in-IDE status bar + per-turn toast): point the user to
   `docs/setup.md` steps 4 to build and install the extension `.vsix`. The hook
   works without it.

6. Verify. Ask the user to run any normal Cascade prompt, then check the data
   directory:
   - `~/.cascade-cost-meter/inbox.jsonl` gained a line → the hook fired (works
     even without the extension).
   - If the `.vsix` is installed, `~/.cascade-cost-meter/usage.jsonl` also gained
     a line and the status-bar total updated.
   If nothing appears, open the troubleshooting section of `docs/setup.md` and
   confirm the hook schema against the current Windsurf docs.
