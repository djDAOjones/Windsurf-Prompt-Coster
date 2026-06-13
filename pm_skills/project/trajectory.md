# Trajectory

<!-- Shipped-work narrative. The story of what changed over time, in chunks. -->
<!-- Warm tier. Agents do NOT auto-read this every task. Read it on demand:
     during roadmap-refactor.md, release.md, or when reconstructing what
     already shipped. See AGENTS.md -> "Before every task". -->
<!-- Compress on ship. One line per item: the outcome, not the implementation.
     The WHY lives in decision-log.md; the per-file roles live in file-map.md.
     Never paste a decision-log entry in here. A pointer is enough. -->
<!-- Keep every shipped ID individually greppable: start each line with the ID. -->
<!-- Structure: newest phase/milestone at the top. -->
<!-- Budget: see AGENTS.md -> "Memory size budgets". Over budget -> prune-memory.md
     moves the oldest phases to archive/trajectory/ and updates archive/INDEX.md. -->

## Milestone 1.5 — Make it work on real transcripts (shipped 2026-05-31 … 2026-06-13)

- M1.5-P1 — Parser reads Cascade's real action-stream transcript; latest turn estimates ~49.9k in / 2.4k out. See decision-log 2026-05-31.
- M1.5-P2 — Curated current model prices + read-only `models` discovery command; real event estimates $0.3083. See decision-log 2026-05-31.
- M1.5-P3 — One turn, one record: per-`executionId` claim + dedup-on-read + `dedup` cleanup. See decision-log 2026-05-31.
- M1.5-P5 — Read-only `doctor` + live `doctor --watch` canary classify the whole pipeline into one verdict. See decision-log 2026-06-13.
- M1.5-P6 — Root cause + fix: hook used a bare `node` unresolvable on Windsurf's GUI PATH; installer now pins an absolute node. See decision-log 2026-06-13.

Outcome: the meter parses real transcripts, prices current models, records exactly one record per turn, and self-diagnoses. On-machine verification (Phase 4) is still open — see backlog.

## Milestone 1 — Extension MVP (shipped 2026-05-31; core built + tested)

- M1-1 — Project scaffold: ESM `package.json`, Vitest, `src/core`/`bin`/`config`/`test` dirs, npm scripts.
- M1-2 — Test fixtures: sanitised event payloads + a fake JSONL transcript.
- M1-3 — Shared core: transcript parser (JSONL → normalised turn; tolerant of malformed lines/drift).
- M1-4 — Shared core: token estimator (heuristic baseline + optional OpenAI exact path). See decision-log 2026-05-31.
- M1-5 — Shared core: pricing registry (load/validate versioned config; `null` for unknown).
- M1-6 — Shared core: cost calculator (tokens × rates → USD or "cost unavailable"). See decision-log 2026-05-31.
- M1-7 — Config + paths module (`~/.cascade-cost-meter/`, settings defaults, privacy flags).
- M1-8 — Usage log + inbox (append JSONL records / durable queue with offset).
- M1-9 — Hook entry (`bin`): read stdin JSON, append to `inbox.jsonl`, exit 0, fail-safe.
- M1-10 — Headless CLI (`bin`): run the full core pipeline on an event.
- M1-11 — Seed config: `pricing.v1.json`, `settings.example.json`, `hooks.example.json`.
- M1-12 — Extension: watch inbox, status-bar total, per-turn toast, usage-log/today commands, backfill on activation. See decision-log 2026-05-31.
- M1-13 — Setup guide (`docs/setup.md`).
- M1-14 — One-command hook installer (`npm run setup` + pure `hooksConfig`: auto-detect path, safe merge, backup, idempotent). See decision-log 2026-05-31.
- M1-15 — Package `.vsix` via a zero-dep zip packager (vsce hung on the OneDrive path). See decision-log 2026-05-31.

Outcome: a tested shared core + hook + extension; Vitest green and the esbuild bundle verified.

## Milestone 0 — Planning (shipped 2026-05-31)

- M0-1 — Researched official Windsurf docs (hooks, analytics, pricing, extensions).
- M0-2 — Initial project memory: brief, architecture, backlog, decision-log, file-map, conventions.
- M0-3 — Deliverables: scoping, design options, feasibility matrix, privacy notes, limitations, verification checklist.
- M0-4 — Scope sign-off (approved 2026-05-31): extension in MVP (status bar, toast, usage-log command); OS notification deferred. See decision-log 2026-05-31.

Outcome: research, initial memory, and scope sign-off complete.
