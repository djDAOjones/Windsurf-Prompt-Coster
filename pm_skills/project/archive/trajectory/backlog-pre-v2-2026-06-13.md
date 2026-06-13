# Backlog

<!-- Generated during project initialization. Edit freely. -->
<!-- Status: [ ] todo  [~] in progress  [x] done  [-] cut -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See AGENTS.md → "Memory size budgets" for archiving thresholds. -->

## Active

### Milestone 0 — Planning (done)

- [x] Research official Windsurf docs (hooks, analytics, pricing, extensions).
- [x] Project memory: brief, architecture, backlog, decision log, file map, conventions.
- [x] Deliverables: scoping, design options, feasibility matrix, privacy notes,
  limitations, verification checklist.
- [x] **Scope sign-off** — approved 2026-05-31; extension in MVP (status bar total,
  per-turn in-IDE toast, usage-log command); no OS notification in MVP.

### Milestone 1 — Extension MVP (core built + tested; on-machine verify pending)

<!-- Shared core + hook + extension. 60/60 Vitest tests pass; esbuild bundle OK. -->

- [x] Project scaffold — root `package.json` (ESM, Node LTS), Vitest dev dep,
  `src/core` / `bin` / `config` / `test` dirs, npm scripts.
- [x] Test fixtures — sanitized `…_with_transcript` + `post_cascade_response`
  payloads and a fake JSONL transcript.
- [x] Shared core: transcript parser — JSONL → normalised turn; tolerate malformed
  lines and schema drift. *(tested)*
- [x] Shared core: token estimator — heuristic baseline + pluggable exact path
  (OpenAI via optional `js-tiktoken`). *(tested)*
- [x] Shared core: pricing registry — load/validate versioned config; look up
  model/alias; `null` for unknown. *(tested)*
- [x] Shared core: cost calculator — tokens × rates → estimated USD or
  "cost unavailable". *(tested)*
- [x] Config + paths module — resolve `~/.cascade-cost-meter/`, settings defaults,
  privacy flags. *(tested)*
- [x] Usage log + inbox — append JSONL records / durable queue with offset. *(tested)*
- [x] Hook entry (`bin`) — read stdin JSON, append event to `inbox.jsonl`, exit 0;
  fail-safe. *(tested for never-crash)*
- [x] Headless CLI (`bin`) — run the full core pipeline on an event (tests /
  no-extension use). *(tested + manual smoke run)*
- [x] Seed config — `pricing.v1.json`, `settings.example.json`, `hooks.example.json`.
- [x] Extension — `fs.watch` the inbox, compute via core, append to log; status
  bar running total; per-turn in-IDE toast; usage-log + today commands;
  backfill on activation. *(code complete; esbuild bundle verified)*
- [x] Setup guide (`docs/setup.md`).
- [x] One-command hook installer — `npm run setup` (`bin/install.js` + pure
  `hooksConfig`): auto-detects the repo path, safely merges into `hooks.json`
  (backup, idempotent, refuses malformed); `docs/install.md` + `/setup` workflow.
  *(tested; 18 new tests)*
- [x] Package `.vsix` (`npm run package:ext` → zero-dep zip packager;
  `vsce` hung on the OneDrive path). Output: `extension/cascade-cost-meter.vsix`.
- [ ] On-machine verification pass against `docs/verification-checklist.md`
  (install `.vsix`, wire the hook, trigger a real Cascade turn).
  *(Superseded by Milestone 1.5 Phase 4 — first on-machine run surfaced the bugs
  that 1.5 fixes; verification is blocked until those land.)*

### Milestone 1.5 — Make it work on real transcripts (diagnosis-driven, 2026-05-31)

<!-- First real Cascade turn recorded $0 / "cost unavailable": the parser did not
     understand the live transcript schema (0 tokens) and the model label was not
     priced; also 1 hook event produced 2 usage records (multi-host double-process).
     Full diagnosis in the 2026-05-31 chat. Phased fix plan approved by the maintainer. -->

- [x] **Phase 1 — Parser correctness.** Teach the parser Cascade's action-stream
  schema (`user_input.user_response`, `planner_response.response`); estimate the
  latest turn → non-zero tokens, `transcriptStatus:"parsed"`. Add a real-schema
  fixture; update parser/pipeline/integration tests.
  *(done 2026-05-31: real transcript parses to ~49.9k in / 2.4k out; 66 tests green.
  Residual `cost_unavailable` is now purely the pricing gap → Phase 2.)*
- [x] **Phase 2 — Current models & approximate costs.** Auto-discover model labels
  from hook events; expand/curate `pricing.v1.json` for current Windsurf models
  (incl. `Claude Opus 4.8 Max`); surface unpriced models; provide an easy/refreshable
  way to keep approximate costs current (provider list price and/or ACU-credit
  basis — design TBD). No network in the default path.
  *(done 2026-05-31: curated current prices — Opus 4.8 $5/$25 [corrected from stale
  $15/$75], Sonnet 4.5, Haiku 4.5, GPT-5.4, o3 fix; added `cascade-cost-meter models`
  discovery command + `docs/pricing.md`; 73 tests. Real event now estimates $0.3083.
  Deferred: opt-in price fetch + ACU-credit basis → wish-list.)*
- [x] **Phase 3 — One turn, one record.** Dedupe by `executionId` with an atomic
  per-turn claim (`wx` lock under `locks/`): `appendUsageOnce` records only the claim
  winner, `summarize` dedupes on read, and `cascade-cost-meter dedup` cleans the log
  (behind a `.bak`). *(done 2026-05-31: 85 tests green; real log cleaned 2 → 1.
  Tightening the `fs.watch` filter proved unnecessary — the claim fixes the race at
  the source.)*
- [~] **Phase 4 — Verify on-machine & ship.** Core verified on-machine (real log
  dedupes via the new command; backup kept) and the `.vsix` re-packaged. Remaining
  (manual): reinstall the `.vsix`, reload Windsurf, drive a real turn, and confirm one
  usage record per turn with correct $ against `docs/verification-checklist.md`.
  (Subsumes the Milestone 1 verification item.)
- [x] **Phase 5 — `doctor` + live canary (diagnosis tooling).** Read-only
  `cascade-cost-meter doctor` (`npm run doctor`) classifies the whole chain
  (Node, hook config, data dir, inbox bridge/offset, parser health, pricing,
  installed-vs-built extension, coverage) into one verdict; `doctor --watch`
  drives one live Cascade turn and names the broken link
  (coverage / hook firing / extension bridge / parsing / pricing / healthy).
  *(done 2026-06-13: `src/diag/probe.js` + `src/core/doctor.js` + `src/diag/canary.js`;
  43 new tests, 128 total. On this machine the verdict is **coverage** — recent
  activity is the Codex surface, not the Cascade panel; hook/bridge/parser/pricing
  all PASS and the installed extension matches the local build, so the pipeline is
  healthy and just unobserved. The only real usage record is the pre-fix
  unparsed/$0 one from 13d ago.)*
- [x] **Phase 6 — Root cause: hook `node` PATH (supersedes Phase 5's "coverage").**
  `doctor --watch` run twice with real Cascade prompts saw NOTHING, disproving the
  "wrong surface" read. Investigation: hook wired correctly but used a bare `node`;
  Windsurf runs hooks via `bash -c` with a minimal GUI/launchd PATH that excludes
  Homebrew (`/opt/homebrew/bin`), so `node` was "command not found" and the hook
  silently never ran. Fix: installer now pins an absolute node (stable symlink,
  Cellar fallback); `doctor` gained a `Hook node` check + `hook config` FAIL
  verdict for bare/missing node; canary message broadened; docs require absolute
  node + full restart. *(done 2026-06-13: 138 tests; live hook rewired to
  `/opt/homebrew/bin/node`; `doctor` now PASSES Hook node. **Pending user:** fully
  restart Windsurf, then `doctor --watch` + one Cascade prompt → expect `healthy`.
  This unblocks the Phase 4 on-machine verification above.)*

### Milestone 2 — Robustness, totals, cross-platform

- [ ] OS notification fallback when the extension is inactive (macOS `osascript`,
  then Linux `notify-send`, Windows PowerShell toast).
- [ ] Configurable currency and per-turn threshold.
- [ ] Richer session/daily totals and per-model breakdown.
- [ ] Publish the extension to the Open VSX registry.

### Icebox

<!-- Post-triage; promote from wish-list.md as they mature. -->

- [ ] Sidebar dashboard / webview with charts.
- [ ] Analytics API reconciliation for Teams/Enterprise users (daily, per model).
- [ ] Exact tokenizer coverage for non-OpenAI models (blocked: no public tokenizer).

---

## Completed

<!-- Move finished tasks here. Keeps the Active section lean.
     Format: [x] Task — description -->
