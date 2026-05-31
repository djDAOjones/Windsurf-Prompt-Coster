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

Project memory has three read tiers. Load only what each tier
prescribes — this keeps session context bounded.

**Hot whole-file** — read every task:

- `README.md`
- `pm_skills/project/brief.md`
- `pm_skills/project/architecture.md`
- `pm_skills/project/conventions.md` (if it exists)
- `pm_skills/project/file-map.md`
- `UI-STANDARDS.md` — only when the task touches UI, controls, text,
  states, accessibility, or user-facing behaviour.
- `DEV-INFRASTRUCTURE.md` (if it exists) — only when the task touches
  build, dev server, versioning, or scripts.

**Hot sectional** — read by section only:

- `pm_skills/project/backlog.md` — read only the **Active** section.
  Read **Completed** only when verifying shipped behaviour.
- `pm_skills/project/decision-log.md` — read only the **latest 10
  entries**. Search older entries on demand when prior-decision
  context is needed.

**Cold** — never auto-read:

- `pm_skills/project/wish-list.md` — capture inbox for unscoped ideas.
  Read only during an explicit triage pass (see "Capturing deferred
  ideas" below); never auto-load.
- `pm_skills/project/archive/*.md` — historical content moved out of
  hot files. Search via grep when explicitly relevant; never auto-load.

### Memory size budgets

Whole-read files have soft word budgets. The end-of-task update
check flags overruns and proposes running
`pm_skills/prompts/prune-memory.md`. Do not auto-prune — always
propose first.

| Scope | Soft limit | Action when exceeded |
| --- | --- | --- |
| Any single hot whole-file read | 2,000 words | Propose summarising or splitting. |
| Total hot whole-file set | 8,000 words | Propose memory-wide review. |
| `backlog.md` Completed items | 40 entries | Propose archiving oldest, keeping the most recent 30, to `archive/backlog-shipped.md`. |
| `decision-log.md` total entries | 20 entries | Propose an archive split to `archive/decision-log-*.md` (by whole month; by date-range when one month alone exceeds the budget). Keep at least the read-tier latest 10 live. |
| `decision-log.md` oldest entry age | 90 days | Propose an archive split, oldest months first — but only when ≥ 5 entries lie beyond the latest-10 read-tier floor (live log ≥ 15). Below that, note the overrun and skip: on low-velocity / sporadic projects the age budget keeps tripping with little to move, so entry-count and word budgets are the meaningful triggers. |
| `wish-list.md` open items | 25 items | Propose a triage pass (promote each into `backlog.md`, or cut). Never archive — the wish-list shrinks by triage, not by moving content to `archive/`. |

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

<!-- CUSTOMISE: Replace the defaults below with this project's actual
     testing policy. See init.md Step 6 for stage examples. -->

- Run the project's build and test steps after every change. If no
  automated test runner exists yet, verify the change manually and
  note what was checked.
- Never delete or weaken existing tests.
- Add a test for any new model method or utility function when a
  test runner is available.

Project-specific testing policy (framework, coverage bar, what to
test) is in `pm_skills/project/conventions.md`.

---

## Files to never edit

- `pm-skills/` — the framework clone, kept only as the upgrade reference.
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
| `project/` memory files | Brief, architecture, backlog, wish-list, file map, conventions, decision log | End of every task session |
| `project/archive/` | Historical content moved out of hot files | Only via `pm_skills/prompts/prune-memory.md` |

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

Project-specific anti-patterns are in
`pm_skills/project/conventions.md` under
"Patterns to avoid".

### Project-specific anti-patterns

- Printing the cost to stdout and assuming Cascade will display it (the
  post-response hook's `show_output` is disabled — it will not).
- Calling a network or tokenizer service in the default path "for accuracy".
- Hard-coding model→price maps anywhere outside the versioned config.
- Letting a parsing edge case throw out of the hook entry point.
