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

<!-- Shared core + hook + extension. 42/42 Vitest tests pass; esbuild bundle OK. -->

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
- [x] Package `.vsix` (`npm run package:ext` → zero-dep zip packager;
  `vsce` hung on the OneDrive path). Output: `extension/cascade-cost-meter.vsix`.
- [ ] On-machine verification pass against `docs/verification-checklist.md`
  (install `.vsix`, wire the hook, trigger a real Cascade turn).

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
