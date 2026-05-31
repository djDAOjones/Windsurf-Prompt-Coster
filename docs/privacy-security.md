# Privacy & Security

The default posture is **local-only and counts-not-content**. The transcript can
contain source code and other sensitive data (the hooks docs note the response
"may contain sensitive" content), so the tool minimises what it touches and keeps
everything on the machine.

## Principles

1. **No network by default.** The default path makes zero outbound requests. Any
   external call (e.g. Analytics reconciliation) is a separate, opt-in feature.
2. **Counts, not content.** The usage log stores token counts, model, estimated
   cost, IDs, and timestamps — **never raw prompt/response text** unless the user
   explicitly opts in.
3. **Read promptly, retain little.** Transcripts are read to estimate, not copied.
4. **Fail safe.** Errors are caught and logged locally; the hook always exits 0.

## What is read vs stored

| Data | Read (in memory) | Stored in `usage.jsonl` |
| --- | --- | --- |
| Model name | Yes | Yes |
| `trajectory_id`, `execution_id` | Yes | Yes |
| Timestamp | Yes | Yes |
| Estimated input/output tokens | Yes | Yes |
| Estimated cost + pricing version | Yes | Yes |
| Prompt text | Yes (to count) | **No** (opt-in only) |
| Response text | Yes (to count) | **No** (opt-in only) |

## Where data lives

- **Our config + log:** `~/.cascade-cost-meter/` (`settings.json`,
  `pricing/`, `usage.jsonl`) — in the user home, **outside this repo**.
- **Windsurf transcripts (not ours):** `~/.windsurf/transcripts/`, `0600`,
  capped at 100 files. We only read them.
- **Repo hygiene:** no real logs in the repo; `.gitignore` excludes any local
  log/sample. Tests use sanitized fixtures only.

> **Cloud-sync caution:** this repository lives under a OneDrive-synced path.
> Logs are deliberately written to `~/.cascade-cost-meter/` (not synced) so usage
> history is never uploaded to cloud storage. Do not relocate the log into a
> synced folder.

## File permissions

- Create `~/.cascade-cost-meter/` and `usage.jsonl` with owner-only perms
  (`0700` / `0600`), mirroring Windsurf's transcript handling.

## Opt-in raw text

- A single explicit setting (default **off**) may store truncated prompt/response
  text for debugging. When off, no text is persisted. The setting is documented
  and surfaced in `settings.example.json`.

## Supply chain

- Zero runtime dependencies in the default build minimises supply-chain risk. Any
  added dependency (e.g. a tokenizer) requires explicit approval and is loaded
  lazily/optionally.

## Out of scope (security)

- No authentication, no secrets, no remote endpoints in the MVP. If Analytics
  reconciliation is added later, the `service_key` must be read from the
  environment or an OS keychain — never hard-coded or logged.
