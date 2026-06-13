# AI Agent Rules

## Product identity

**Cascade Cost Meter** — a local, privacy-first cost meter for Windsurf
Cascade. A documented post-response Cascade hook runs a Node.js CLI that reads
the on-disk transcript, **estimates** input/output tokens, prices them from a
versioned local config, shows an OS notification, and appends a local JSONL
record. The canonical mental model is an **after-the-fact, local estimator** —
not a billing system, not a network service, and not a source of exact token
counts (no official Windsurf surface exposes those per turn). Every figure is
labelled an estimate.

---

## Who you are working with

The maintainer is a vibe coder who owns macro structure, UX direction,
and conceptual design — but not deep implementation. Do the work; don't
explain concepts back unless asked.

---

## Before every task

<!-- CUSTOMISE: README.md below refers to the project's own root README
     (created at init Step 5). If init is incomplete, skip this section. -->

### Read tiers

Project memory has four read tiers. Load only what each tier
prescribes — this keeps session context bounded.

**Hot whole-file** — read every task. Three groups, budgeted differently:

_Reference docs_ — written once to a natural size; they do not accrete,
so each carries only a soft size guideline, **not** a prune target:

- `README.md`
- `pm_skills/project/brief.md`
- `pm_skills/project/architecture.md`
- `pm_skills/project/conventions.md` (if it exists)

_Accreting_ — read every task, but grows as agents append per-task
roles/notes, so it carries a hard, prunable budget:

- `pm_skills/project/file-map.md`

_Conditional_ — read **only** when the task touches the domain (a task
usually touches one, rarely both), so **not** counted in the every-task
read-load review:

- `UI-STANDARDS.md` — UI, controls, text, states, accessibility, or
  user-facing behaviour.
- `DEV-INFRASTRUCTURE.md` (if it exists) — build, dev server,
  versioning, or scripts.

**Hot sectional** — read by section only:

- `pm_skills/project/backlog.md` — read only the **Active** section
  (open work: Current, Next, Icebox). Shipped work is not here — see
  `trajectory.md`.
- `pm_skills/project/decision-log.md` — read only the **latest 10
  entries**. Search older entries on demand when prior-decision
  context is needed.

**Warm** — read on demand, not auto-read every task:

- `pm_skills/project/trajectory.md` — the shipped-work narrative. Read
  during `roadmap-refactor.md`, release work, or when reconstructing
  what already shipped.

**Cold** — never auto-read:

- `pm_skills/project/wish-list.md` — capture inbox for unscoped ideas.
  Read only during an explicit triage pass (see "Capturing deferred
  ideas" below); never auto-load.
- `pm_skills/project/archive/*.md` — historical content moved out of
  hot files. Search via grep when explicitly relevant; never auto-load.

### Memory size budgets

Memory files have word/entry budgets: **hard, prunable** limits on
accreting files (`file-map.md`, the sectional `backlog.md` /
`decision-log.md`, `trajectory.md`) and **soft** size guidelines on
reference docs (see the table). The end-of-task update check flags
overruns and proposes running `pm_skills/prompts/prune-memory.md`. Do
not auto-prune — always propose first.

| Scope | Soft limit | Action when exceeded |
| --- | --- | --- |
| Reference doc (`README`, `brief.md`, `architecture.md`, `conventions.md`, + project standards/process/infra docs) | soft ~3,500 words each | Not a prune target — reference docs don't accrete. If one is genuinely bloated, tighten it or split detail into a permanent contract file; never strip to hit a number. |
| `file-map.md` (accreting) | 2,000 words | Propose `prune-memory.md`: strip accreted history (task tags, dates, test counts) to `archive/file-map-*-historical.md`, keep current roles. Floor = the irreducible current-role list; on a large codebase that may exceed 2,000, which is fine — strip noise, not signal. |
| Every-task read load | structural (no aggregate word cap) | A fixed sum fires permanently on a mature project (≥ 5 hot files × the 2,000 file budget > any flat cap), so there is none. Healthy = each file within its own row above. If the always-read set keeps growing, review whether a hot read should move to _conditional_ or _warm_, or whether a reference doc has bloated. |
| `backlog.md` Active | 1,500 words **or** ~40 open items (whichever trips first) | Propose `roadmap-refactor.md`: restructure by lifecycle, evict done-work, dedupe stale rounds. A low item count with high words means items are too verbose — tighten them. |
| `backlog.md` shipped work | 0 — done `[x]` items do not live here | Move each to `trajectory.md` (one line) + `decision-log.md` (the why). Flagged by `end-of-task.md` and `doctor-memory.md`. |
| `trajectory.md` | 2,000 words | Propose archiving the oldest phases to `archive/trajectory/`, keeping `archive/INDEX.md` current. |
| `decision-log.md` live log | 20 entries (primary) **or** ~6,000 words | Propose an archive split to `archive/decision-log-*.md` (by whole month; by date-range when one month alone exceeds a budget). Entry count is the primary trigger; the word budget is a secondary guard against runaway entries — a healthy entry is ~150–300 words (Decision, Rationale, Alternatives, Link), not an essay. Keep at least the read-tier latest 10 live. |
| `decision-log.md` oldest entry age | 90 days | Propose an archive split, oldest first — but only when ≥ 5 entries lie beyond the latest-10 read-tier floor (live log ≥ 15). Below that, note the overrun and skip: on low-velocity / sporadic projects the age budget keeps tripping with little to move, so the entry-count and word budgets are the meaningful triggers. |
| `wish-list.md` open items | 25 items | Propose a triage pass (promote each into `backlog.md`, or cut). Never archive — the wish-list shrinks by triage, not by moving content to `archive/`. |
| `archive/` chunk | one epoch per file (whole month / migration boundary) | Chunk cold archives by **sequence boundary for INDEX browsability**, not size — they're never auto-read (grep + line-range only), so word count barely matters and an epoch bounds its own growth. Sub-split a single epoch only if it's genuinely unwieldy to grep; never split or merge epochs just to hit a number. Maintain `archive/INDEX.md`. |

### Workflow

1. For non-trivial work, follow the 4-stage prompt sequence in
   `pm_skills/prompts/`: `scoping.md` → `design-options.md` →
   `implementation-plan.md` → `validation.md`. Get user sign-off on
   scope before writing code. For small tasks, use
   `pm_skills/prompts/quick-task.md` instead.
2. Search the full source tree before proposing changes. Check for
   existing tuneable values and UI controls before adding new ones.
3. Exception: if the user explicitly invokes `auto-jazz` or
   `auto-jazz-lite` (see `pm_skills/integrations/`), run those
   workflows without waiting for scope or plan approval. Make the
   best conservative decision at each gate, state the assumption in
   one line, and continue. Only ask the user a question if there is
   a genuinely blocking ambiguity. All other rules in this file
   (source-tree search, project-memory housekeeping, memory size
   check, minimal-change discipline, hard rules) still apply.

---

## Capturing deferred ideas (wish-list)

When an out-of-scope idea surfaces mid-task, append it to
`pm_skills/project/wish-list.md` as a single line and keep working. Do
not act on it, scope it, estimate it, or discuss it unless the user
asks — capturing the one line is the whole interaction.

- **User trigger.** "Park it" (or similar) means: append the idea to
  the wish-list and move on. See `pm_skills/prompts/corrections.md`.
- **Boundary.** The wish-list is the **pre-triage** inbox — raw,
  unjudged ideas. The backlog **Icebox** is **post-triage** — ideas
  already judged worth keeping. Promote items from the wish-list
  _into_ `backlog.md`; never treat the wish-list as a second backlog.
- **Triage, not hoarding.** Drain the wish-list during
  `pm_skills/prompts/next-batch.md` (and when the `end-of-task.md`
  size check flags it): promote each item into the backlog, or cut
  it. Promoting moves the line out; cutting deletes it. No history is
  kept in the wish-list.

---

## Hard rules (invariants)

- **All imports at the top of the file.** Mid-file imports break
  bundlers and make dependency chains harder to trace.
- **Build output directories are read-only.** Never hand-edit files
  that are overwritten by the build step.
- **Minimal runtime dependencies.** Do not add packages without
  explicit approval.
- **Carbon-first UI.** All UI work must follow IBM Carbon's productive
  design language: components, patterns, tokens, spacing, and
  interaction conventions. Carbon is the reference standard for how
  controls should look, behave, and be structured — but implemented in
  the project's own code, not via Carbon packages. See
  `UI-STANDARDS.md` for full rules.
- **WCAG 2.2 AAA by default.** 7:1 text contrast for normal text,
  ≥ 44 × 44 CSS px pointer targets, visible focus rings, no
  colour-only meaning. Where Carbon defaults meet AA but not AAA,
  adapt them. See `UI-STANDARDS.md` for full accessibility rules.

### Project-specific invariants

- **Never disrupt Cascade.** The hook entry point must catch all errors, log
  locally, and exit 0. A failure shows no cost — it never blocks or breaks a turn.
- **Local-only by default.** No network calls in the default path. Any external
  call (e.g. Analytics reconciliation) is opt-in, explicit, and separate.
- **Counts, not content.** Log token counts, model, cost, IDs, and timestamps —
  never raw prompt/response text unless the user explicitly opts in.
- **Cost is always an estimate.** Label every figure "estimate"; show
  "cost unavailable" for unknown models rather than guessing.
- **Pricing is versioned config, never code.** Rates live in `pricing.vN.json`
  with a basis label and effective date.
- **Official documented APIs only.** No scraping of private app internals in the
  default product; any such path is a clearly separated experimental opt-in.
- **MVP is headless.** The Carbon-first UI and WCAG 2.2 AAA invariants above
  apply to the optional extension UI (iceboxed), not the CLI/notification MVP.

---

## Core data model

Three small, plain data shapes flow through the pipeline:

- **HookEvent** — parsed from the hook's stdin JSON: `agentActionName`,
  `modelName`, `trajectoryId`, `executionId`, `timestamp`, and either
  `transcriptPath` or `responseText`.
- **Turn** — normalised from the transcript: `model`, input/output text (or
  pre-counted sizes), estimated `inputTokens` and `outputTokens`, `trajectoryId`,
  `executionId`, `timestamp`.
- **PricingEntry** — from the config: `model`, `usdPer1MInput`, `usdPer1MOutput`,
  optional `aliases`; plus file-level `version`, `pricingBasis`, `effectiveDate`.

The **UsageRecord** appended to the log is `Turn` minus raw text, plus
`estimatedCostUsd` (or `null`) and the `pricingVersion` used.

---

## Estimation pipeline

One direction, one shot per hook event:

`collector → transcript parser → token estimator → pricing registry →
cost calculator → (notification + usage log)`

Each stage is independently testable and degrades gracefully: a missing
transcript still yields a notification from the hook summary; an unknown model
still logs token estimates with "cost unavailable".

---

## Protected infrastructure

| Module / path | Why protected |
| --- | --- |
| `bin/cascade-cost-meter.js` fail-safe guard | Removing it lets errors escape into Cascade. |
| `config/pricing/*.json` schema (version, basis, date) | The registry and calculator depend on it. |
| `~/.cascade-cost-meter/usage.jsonl` format | Append-only history; changing the shape breaks past records. |
| `hooks.example.json` event name | Must match the documented Windsurf hook event. |

Do not delete, rename, or restructure these without explicit approval.

---

## Communication pattern

The MVP is a single short-lived process using **direct imports** (no event bus).
Cross-process communication with a future extension uses the **hook → file →
`fs.watch`** bridge (the usage log or a small state file), not a custom IPC channel.

---

## Minimal change discipline

- Don't reorganise code you weren't asked to touch.
- Don't add or remove comments in code you weren't asked to touch.
  New code should follow the documentation rules below.
- Don't introduce new abstractions for a single use case.
- Match existing style (indent size, quote style, semicolons, etc.).
- Avoid speculative abstractions unless there is duplication, unstable
  logic, or a clear reuse case.

---

## Code documentation

<!-- CUSTOMISE: JSDoc is the default for JS/TS. Adjust for other languages
     (e.g. docstrings for Python). -->

- New and modified functions, classes, and modules should have
  meaningful comments explaining **why**, not restating **what**.
- Use **JSDoc** for exported functions, classes, and modules. Document
  purpose, parameters, return values, and side effects.
- Comments are for AI agents first and future humans second. Write
  them to provide context that is not obvious from the code alone.
- Do not add boilerplate or redundant comments that restate the code.
  Every comment should earn its place.

Project-specific documentation conventions (what to document, depth,
exceptions) are in `pm_skills/project/conventions.md`.

---

## Testing

Tests protect invariants — behaviours that would do real damage if they
silently broke. Write a test to prove an invariant, not to chase a
coverage number; coverage is a warning light, never a target.

**Named categories, never "add tests" in the abstract.** When a change
warrants tests, cover the categories that apply: happy path, empty,
error, boundary, permission/gating, regression (one per fixed bug), and
a persistence round-trip (write → reload) for stateful changes.
**"Not applicable" is a valid outcome** — if no meaningful invariant is
at risk, say so rather than manufacture tests.

**Fast and hermetic.** Prefer in-process injection, fakes, and temp
directories over live servers and real I/O — fast enough to run on
every change.

**Two layers.** The automated safety net never replaces the manual gate
(real browsers, devices, permissions, rehearsal). Name what only a
human can verify.

**Hard rules.**

- Run build and tests after every change; if no runner exists yet,
  verify manually and note what was checked.
- Never silently delete, skip, or weaken a test to make a change pass.
  If a test is genuinely obsolete because the intended behaviour
  changed, say so and update or remove it as part of the approved
  change.
- Never write hollow tests (assertion-free, snapshot-everything, or
  mocking the unit under test). A test that cannot fail protects
  nothing.
- Rigour ramps with maturity; before invariants stabilise (e.g. the
  first MVP build), deferring tests and saying so is correct.

Tooling and project-specific policy (runner, config, what to test) live
in `pm_skills/project/conventions.md`.

---

## Files to never edit

- `~/.cascade-cost-meter/usage.jsonl` — a user's real usage history (tests use
  fixtures, never the live log).
- `.editorconfig`, `.markdownlint.json` — shared mechanical config.

See `DEV-INFRASTRUCTURE.md` for the concrete list of protected paths once the
build is set up.

---

## Adding a field to the usage record

To make a new per-turn field survive into history and tooling:

1. Add it to the `Turn`/`UsageRecord` shape and the collector/parser that fills it.
2. Ensure it is **counts/metadata, not raw text** (or gate it behind the opt-in).
3. Write it in `log/usageLog.js`; bump the record `schemaVersion` if the shape changed.
4. Keep readers tolerant of older records that lack the field.
5. Add or extend a fixture and a test covering old-and-new record shapes.

---

## Document ownership

| Layer | Owns | Update when |
| --- | --- | --- |
| `AGENTS.md` | Hard rules, invariants, data model, anti-patterns | Major architectural or design decisions change |
| `UI-STANDARDS.md` | UI, accessibility, usability rules | New token systems or UI conventions established |
| `DEV-INFRASTRUCTURE.md` | Build, dev server, versioning, scripts | Build or deployment decisions change |
| `project/` memory files | Brief, architecture, backlog, wish-list, trajectory, file map, conventions, decision log | End of every task session |
| `project/archive/` | Historical content moved out of hot files, indexed in `archive/INDEX.md` | Only via `pm_skills/prompts/prune-memory.md` or `roadmap-refactor.md` |

When in doubt: unconditional invariant → `AGENTS.md`. UI convention →
`UI-STANDARDS.md`. Build/dev rule → `DEV-INFRASTRUCTURE.md`. Evolving
context → `project/`. Historical content → `project/archive/`.

---

## Anti-patterns to reject

- Bypassing the project's established communication pattern (e.g.
  direct method calls when the project uses events or hooks).
- Inventing a custom UI control when Carbon provides a suitable pattern.
- Installing Carbon packages instead of implementing to Carbon's spec.
- Leaving a panel, state, or error condition without an intentional,
  visible, accessible treatment.
- Hard-coding values that should be tokenised or configurable.
- Adding runtime dependencies without explicit approval.
- Letting the `wish-list.md` inbox become a write-only graveyard, or
  scoping or estimating its items at capture time. Capture is one
  line; judgement happens at triage.
- Leaving shipped (`[x]`) work in the backlog. Completed work moves to
  `trajectory.md` (one line) plus `decision-log.md` (the why); the
  backlog holds open work only.
- Letting the backlog become an audit trail of dated rounds, or
  narrating a shipped item in full in both the backlog and the
  decision-log. Compress on ship; run `roadmap-refactor.md` to repair
  drift.

Project-specific anti-patterns are in
`pm_skills/project/conventions.md` under
"Patterns to avoid".

### Project-specific anti-patterns

- Printing the cost to stdout and assuming Cascade will display it (the
  post-response hook's `show_output` is disabled — it will not).
- Calling a network or tokenizer service in the default path "for accuracy".
- Hard-coding model→price maps anywhere outside the versioned config.
- Letting a parsing edge case throw out of the hook entry point.
