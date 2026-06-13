# Changelog

Append-only record of pm-skills framework releases. Newest entry at
the top. Never rewrite a published entry.

This file is the **upgrade instruction set**. Each release lists what
changed and, critically, an **Upgrade actions** block: the mechanical
steps an agent applies to move a project from the previous version to
this one. The upgrade procedure (`prompts/upgrade.md`) reads the
entries between a project's current `VERSION` and the latest, and
executes their Upgrade actions in order — oldest first.

Versioning is semver-style for a docs framework:

- **major** — structural or breaking change that needs a migration
  (renamed/removed files, restructured templates, changed memory
  contracts).
- **minor** — new file or capability, backward compatible (a new
  prompt, integration, or template section).
- **patch** — wording, clarification, or fix with no new files and no
  migration.

Maintainers: every framework change must bump `pm_skills/VERSION` and
add an entry here. See `prompts/release.md`.

---

## 2.2.1 — 2026-06-04

Fixes a smaller sibling of the 2.1.0 bug, surfaced by dogfooding a prune
on the same mature project. Two cold decision-log archive chunks sat ~3×
over the 8,000-word `archive/` chunk cap and had been flagged-and-deferred
across two prune sessions — the same "always-red, always-ignored" dynamic
2.1.0 removed from the hot-set.

Root cause: the chunk cap measured the wrong thing. Its rationale —
"split so each loads in one read" — is obsolete: cold archives are never
auto-read; they're grepped, then a line-range is read, so file size is
irrelevant. The cap's only effect was to force navigationally-useless
splits (the project literally had a `decision-log-2026-06-01.md` and a
`decision-log-2026-06-01-b.md` — the same day split in two purely to
satisfy the cap). The real value of chunking is INDEX browsability, which
is a *boundary* concern (month / migration epoch), not a *size* one.

The fix replaces the word/entry chunk cap with boundary-based chunking:
one epoch per file, split only for browsability, never for size. An epoch
bounds its own growth, so nothing accretes unbounded even without a cap.
Also folds two minor consistency fixes found in the same review.

Backward compatible: no files renamed or removed, no data migration.
Existing oversized cold chunks are harmless and need no action.

### Changed

- `AGENTS.md` (`root-template`) — the `archive/` chunk budget changes
  from `8,000 words or 20 entries per file` (action: "split so each loads
  in one read") to `one epoch per file (whole month / migration
  boundary)` — chunk by sequence boundary for INDEX browsability, not
  size; sub-split an epoch only if genuinely unwieldy to grep. The
  `backlog.md` Active row's `1,500 words and ~40 open items` is clarified
  to `or … (whichever trips first)`, with a note that a low item count at
  high words means items are too verbose.
- `pm_skills/prompts/prune-memory.md` — detect no longer word-counts
  archive chunks against a cap (notes multi-epoch spans only); the
  propose / decision-log / rules steps reframe splitting as
  epoch-boundary, browsability-driven; adds an INDEX caveat to put
  entry/word counts only on frozen archive rows, never the live-file row
  (it goes stale the moment the prune appends its own record — an
  off-by-one seen in the live project's INDEX).
- `pm_skills/prompts/doctor-memory.md` — archive-hygiene check drops the
  per-chunk word-count; a multi-epoch chunk is INFO, not a WARN; a
  missing/stale INDEX stays a WARN.
- `pm_skills/prompts/upgrade.md` — the major-version migration routine
  splits archive destinations on epoch boundaries for browsability, not
  when they "exceed a budget".

### Upgrade actions

- Re-merge the `AGENTS.md` "Memory size budgets" table from the new root
  template (`prompts/upgrade.md` Step 7) — specifically the `archive/`
  chunk and `backlog.md` Active rows.
- Replace `pm_skills/prompts/prune-memory.md`,
  `pm_skills/prompts/doctor-memory.md`, and `pm_skills/prompts/upgrade.md`
  (`framework` files).
- No data migration: existing archive chunks are left as-is.

---

## 2.2.0 — 2026-06-03

Adds an end-to-end path from spec to a deployed product, and the
production-deploy primitive it was missing.

Until now the framework took a spec as far as a locally-running
first-milestone MVP (`init-mvp.md`) and then handed back to the
per-milestone loop. Nothing drove a production deploy of a consuming
project — `release.md` versions the framework itself, not your app —
and no single workflow chained foundation → milestones → deploy.

Two new framework files close that gap by composing existing workflows
rather than duplicating them. Backward compatible: no files renamed or
removed, no data migration, no changed memory contracts.

### Added

- `pm_skills/prompts/deploy.md` — canonical production deploy + live-
  verification primitive for a consuming project. Reads
  `DEV-INFRASTRUCTURE.md` → Deployment, runs pre-flight (clean tree,
  green build, version stamped, secrets external), executes the
  documented pipeline, verifies the live result, and rolls back on
  failure. The app-deploy counterpart to `release.md`.
- `pm_skills/integrations/spec-to-prod.md` — orchestrator that chains
  `init-mvp.md` (foundation + MVP) → the `next-batch.md`/`auto-jazz.md`
  milestone loop → `deploy.md`, bounded by a signed-off **scope band**
  (Deployed MVP / Deployed Current milestone / Full backlog to
  production). Adds two gates (foundation, scope band) and an
  opinionated Git-with-remote expectation; delegates all build rigour
  to the workflows it wraps.

### Changed

- `pm_skills/GUIDE.md` — "Start here" gains a spec-to-prod entry; file
  tree and manual-workflow sections list the two new files.
- `README.md` — quick start notes the build-and-ship path.

### Upgrade actions

- Copy the two new `framework` files into your project:
  `pm_skills/prompts/deploy.md` and
  `pm_skills/integrations/spec-to-prod.md`. Both inherit the
  `framework` class from the existing `pm_skills/prompts/*` and
  `pm_skills/integrations/*` manifest wildcards — no `MANIFEST.md`
  change is needed.
- Replace `pm_skills/GUIDE.md` (`framework` file).
- No data migration: existing project memory and populated root
  templates are untouched. To use the new path, ensure
  `DEV-INFRASTRUCTURE.md` → Deployment is populated; `deploy.md` will
  prompt for it if not.

---

## 2.1.0 — 2026-06-03

Recalibrates the memory size budgets. Dogfooding `prune-memory.md` on a
mature project surfaced two budgets that were *permanently* over — alarms
no legal prune could ever clear, which trains both agent and maintainer
to ignore the size check entirely.

Root cause: the budgets treated two different file classes identically.
**Accreting** files (`file-map.md`, `decision-log.md`, `backlog.md`,
`trajectory.md`) genuinely grow and need tight, prunable budgets.
**Reference** docs (`README`, `brief.md`, `architecture.md`,
`conventions.md`, and any project standards/process/infra docs) are
written once to a natural size, never accrete, and have no prune action —
yet the fixed 8,000-word "total hot whole-file set" cap summed them in,
so it fired on every mature project before any work even started (5
default hot files × the 2,000 single-file budget = 10,000 > 8,000). The
two conditional reads (`UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`) were
also counted into the every-task total despite being read only when a
task touches their domain.

The fix splits the hot whole-file tier into **reference** (soft per-doc
guideline, not a prune target), **accreting** `file-map.md` (hard
prunable budget), and **conditional** (excluded from the every-task
load); replaces the fixed hot-set sum with a structural review; and
aligns the decision-log word budget with its entry budget at a realistic
density.

Backward compatible: no files renamed or removed, no data migration. A
project adopts the recalibrated budgets when it next merges the
`AGENTS.md` root template.

### Changed

- `AGENTS.md` (`root-template`) — "Read tiers" Hot whole-file split into
  *reference* / *accreting* (`file-map.md`) / *conditional*
  (`UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`). "Memory size budgets":
  the fixed `Total hot whole-file set | 8,000` row becomes a structural
  *every-task read load* review (no aggregate word cap); reference docs
  get a soft ~3,500-word per-doc guideline (not a prune target);
  `file-map.md` keeps its 2,000 hard budget with an irreducible-roles
  floor note; the `decision-log.md` word budget moves 4,000 → ~6,000
  (consistent with 20 entries × ~300 words), entry count primary.
- `pm_skills/prompts/prune-memory.md` — detect step drops the aggregate
  hot-set sum and anchors the `[x]` count to list items
  (`^\s*[-*] \[x\]`); propose step adds a reference-docs-are-not-prune-
  targets rule and a structural every-task-load review, and notes the
  file-map irreducible-roles floor.
- `pm_skills/prompts/doctor-memory.md` — budget check distinguishes hard
  (accreting / sectional) overruns (FAIL) from soft reference-doc
  overruns (WARN); no aggregate hot-set cap.
- `pm_skills/prompts/end-of-task.md` — size check matches the two-class
  model; anchors the `[x]` grep; adds a decision-log entry-tightness
  note (~150–300 words/entry).
- `pm_skills/GUIDE.md` — Hot whole-file tier summary notes the
  reference / accreting / conditional split.

### Upgrade actions

- Re-merge the `AGENTS.md` "Read tiers" and "Memory size budgets"
  sections from the new root template (`prompts/upgrade.md` Step 7),
  preserving any project-added hot reads (file them under *reference* or
  *conditional*) and any project-specific budget rows.
- Replace `pm_skills/prompts/prune-memory.md`,
  `pm_skills/prompts/doctor-memory.md`,
  `pm_skills/prompts/end-of-task.md`, and `pm_skills/GUIDE.md`
  (`framework` files).
- No data migration: existing memory files are untouched.

---

## 2.0.0 — 2026-06-01

Gives project memory a metabolism. Earlier versions could *capture*
work (backlog, decision-log, wish-list) and *archive* history (prune),
but nothing bounded the **active, forward-looking** layer — and the
budgets keyed off a section name (`## Completed`) that real projects
stopped feeding, recording shipped work as `[x]` items under Active
milestones instead. The result, observed on a mature project: a
~22,000-word backlog that was ~90% shipped work narrated in full, each
item duplicating its decision-log entry, while the prune found almost
nothing to do.

This release re-points the metabolism at the layer that actually grows.
The hot/active layer now holds **open work only**. The moment a task
ships, its record leaves the backlog: a one-line outcome goes to the new
`trajectory.md`, and the *why* stays in `decision-log.md` — written
once, never twice. New budgets measure the right axis (backlog Active
words and open-item count, zero `[x]`, decision-log words, an archive
chunk cap), two new workflows repair and diagnose drift the size check
can't see, and the archive gets a browsable `INDEX.md`.

Breaking because it changes the memory contract: the backlog
`## Completed` section is removed and a new `project-memory` file
(`trajectory.md`) is introduced. The upgrade is a one-time, approved,
non-destructive migration — no history is lost.

### Added

- `pm_skills/project/trajectory.md` (`project-memory`) — the
  shipped-work narrative. **Warm** read tier: read on demand (roadmap
  refactor, release, reconstructing what shipped), not every task.
  One line per item + a decision-log pointer; archives by size to
  `archive/trajectory/`.
- `pm_skills/prompts/roadmap-refactor.md` (`framework`) — repair a
  drifted backlog: regroup by lifecycle and dependency, dedupe stale
  rounds, evict shipped work to `trajectory.md`. Distinct from
  `next-batch` (which picks) and `prune-memory` (which archives by size).
- `pm_skills/prompts/doctor-memory.md` (`framework`) — a read-only
  memory health check for structural drift the size check misses:
  `[x]` in the backlog, stale `file-map` paths, cross-file duplication,
  oversized/un-indexed archives, and framework version lag. Proposes the
  workflow that fixes each finding; never edits.
- A new **Warm** read tier and an `archive/INDEX.md` convention (the
  browsable map of cold storage).

### Changed

- `AGENTS.md` (`root-template`) — four read tiers (added Warm for
  `trajectory.md`); backlog is open-work-only (no Completed); rebuilt
  the **Memory size budgets** table to bound the active layer (backlog
  Active 1,500 words / ~40 open items, zero `[x]`; `trajectory.md`
  2,000 words; decision-log 20 entries **or** 4,000 words; archive chunk
  cap 8,000 words / 20 entries); added anti-patterns for
  shipped-work-in-backlog and audit-trail drift; document-ownership row
  for `trajectory.md`.
- `pm_skills/prompts/end-of-task.md` — decision-log is the canonical
  *why*; on ship, **remove** the backlog item (no Completed section) and
  add one line to `trajectory.md`; the size check counts backlog Active
  words/open/`[x]`, trajectory words, and decision-log words; structural
  backlog issues route to `roadmap-refactor.md`.
- `pm_skills/prompts/prune-memory.md` — relocate stray `[x]` work to
  `trajectory.md`; archive oldest trajectory phases; split the
  decision-log by **words** as well as entries; enforce the archive
  chunk cap; maintain `archive/INDEX.md`.
- `pm_skills/prompts/session-start.md`, `pm_skills/GUIDE.md` — document
  the four tiers, `trajectory.md`, and the two new prompts.
- `pm_skills/project/backlog.md` (`project-memory` template) — removed
  the `## Completed` section; open-work-only with a tiny optional ticket
  grammar (Intent / Done-when) so intent survives compression.
- `pm_skills/project/decision-log.md` (`project-memory` template) —
  noted the word budget and that it is the single home of the *why*.
- `pm_skills/MANIFEST.md` — added the `trajectory.md` path row.
- `pm_skills/prompts/upgrade.md` — Step 8 gains a concrete, repeatable,
  lossless memory-migration routine: snapshot → propose → execute (align
  with any pre-existing archive) → **binary line-anchored ID reconcile**,
  with `VERSION` stamped only after the reconcile passes. The mechanics
  behind the migration below.
- `pm_skills/init.md` + `pm_skills/integrations/init-project.md` — the
  backlog-generation step now produces open-work-only tickets in the
  2.0.0 grammar (Intent / Done-when + flags) so a project is born lean,
  with a compress-on-ship note added to "Memory hygiene".

### Upgrade actions

- Add `pm_skills/prompts/roadmap-refactor.md` and
  `pm_skills/prompts/doctor-memory.md` (`framework` — new files).
- Replace `pm_skills/prompts/end-of-task.md`, `prune-memory.md`,
  `session-start.md`, `upgrade.md`, and `pm_skills/GUIDE.md` with the new
  versions (`framework` — wholesale, subject to the Step 4 customisation
  check).
- Create `pm_skills/project/trajectory.md` from the source template
  (`project-memory` — new file; skip if it already exists, never
  overwrite).
- `AGENTS.md` (`root-template`, 3-way merge): the **Read tiers**,
  **Memory size budgets**, document-ownership, and anti-pattern blocks
  are framework-authored — if the project left them at the defaults,
  replace with the new versions; if the project customised the numbers or
  tiers, surface a diff and let the user adopt. Preserve every
  project-populated section verbatim.
- `pm_skills/project/backlog.md` and `decision-log.md`
  (`project-memory`): apply the new template comments/structure only
  where still the unedited placeholders; never rewrite a project's real
  content. The Completed-section removal is handled by the memory
  migration below, not by overwriting.
- **Memory migration (one-time, approved, non-destructive).** A
  major-version data move; `pm_skills/prompts/upgrade.md` Step 8 runs the
  snapshot → propose → execute → reconcile mechanics. Lose nothing:
  1. **Snapshot** `backlog.md` verbatim to
     `archive/trajectory/backlog-pre-v2-YYYY-MM-DD.md` (byte-identical
     safety net).
  2. Create `trajectory.md` (above).
  3. Run `pm_skills/prompts/roadmap-refactor.md`: relocate every `[x]`
     item and any `## Completed` section out of `backlog.md` into
     `trajectory.md` (one compressed line each, starting with the ID,
     grouped into phases; split into sequential `archive/trajectory/`
     chunks when the live file would exceed its 2,000-word budget),
     confirming each item's *why* already lives in `decision-log.md`.
     Align with any pre-existing shipped archive (e.g. `backlog-shipped.md`)
     rather than duplicating it. Remove `## Completed` once empty.
  4. Create or refresh `archive/INDEX.md`.
  5. **Reconcile (lossless proof):** compare leading item IDs (snapshot
     `- [x] **ID**` lines vs. trajectory `- ID —` lines, anchored to line
     starts) — the set difference must be **empty**; zero `[x]` remain in
     `backlog.md`; the snapshot is still byte-identical. Then run
     `pm_skills/prompts/doctor-memory.md` to confirm budgets, and
     `pm_skills/prompts/prune-memory.md` if the decision-log or any
     chunk is over budget.
  6. Stamp `pm_skills/VERSION` to 2.0.0 **only after** the reconcile
     passes (held at 1.x through the framework sync).
- A project already past these (no `## Completed`, has `trajectory.md`)
  needs only the file/prompt replacements — the migration is a no-op.

## 1.3.0 — 2026-05-31

Bakes in a lean, opinionated testing doctrine — invariant-led, with
named test categories — so testing is a first-class default alongside
Carbon, WCAG 2.2 AAA, Nielsen, and JSDoc. No new standard file, no
coverage threshold, no default security or performance tooling. Tool
names (Vitest, Playwright) live in the project layer, not the
always-read contract.

### Changed

- `AGENTS.md` (`root-template`) — rewrote the **Testing** section:
  tests protect invariants (not coverage); named categories with
  "not applicable" as a valid outcome; fast and hermetic; two layers;
  a softened anti-gaming rule (obsolete tests are updated through the
  approval gate, not silently weakened); no hollow tests; rigour ramps
  with maturity.
- `pm_skills/prompts/validation.md` — Stage 4 "test coverage" became a
  concrete test-plan gate over the named categories, with "not
  applicable" allowed per category.
- `pm_skills/init.md` — replaced the generic testing-policy ladder with
  the opinionated ramp (pre-invariant → safety net → journeys); names
  Vitest and Playwright as the JS/Node default. Step 6's testing item
  now keeps the doctrine and points project specifics to
  `conventions.md`.
- `pm_skills/project/conventions.md` — sharpened the Testing and Tooling
  template guidance (runner config and its reasons, e.g. sequential
  execution when tests mutate env or reset singletons; project
  invariants; default tools).
- `README.md`, `pm_skills/GUIDE.md` — added the testing doctrine to the
  stated defaults.

### Upgrade actions

- Replace `pm_skills/prompts/validation.md` and `pm_skills/init.md` with
  the new versions (`framework` — wholesale).
- In `AGENTS.md` (`root-template`, 3-way merge): if the project still
  has the default Testing section, replace it with the new doctrine; if
  the project customised its Testing section, leave it and offer the new
  doctrine for the user to adopt.
- `pm_skills/project/conventions.md` (`project-memory`): apply the
  improved template guidance only where the Testing/Tooling sections are
  still the unedited placeholders; never overwrite a project's filled-in
  policy.
- No memory migration required.

## 1.2.1 — 2026-05-31

Strengthen the wish-list promote step in `next-batch` so promoted items
are ranked relative to existing backlog items instead of appended
blindly, keeping the next-batch pick reading off a current order.

### Changed

- `pm_skills/prompts/next-batch.md` — promote step now requires placing a
  promoted item relative to existing Current/Next/Icebox items with a
  one-line above/below rationale. Makes `next-batch` the explicit (lazy,
  just-in-time) re-ranking point.

### Upgrade actions

- Replace `pm_skills/prompts/next-batch.md` with the new version. No
  memory migration; behavioural clarification only.

## 1.2.0 — 2026-05-31

Adds `init-mvp`: a guided-then-autonomous workflow that turns wants or
specs into a runnable first-milestone MVP. It marries the gated initializer
(`init-project.md`) with gateless execution (`auto-jazz.md`) — you sign off
the foundation, then it builds to completion — across the whole initial
development phase, with staged rollback checkpoints and a stop-and-narrow
rule for safety.

### Added

- `pm_skills/integrations/init-mvp.md` (`framework`) — gated foundation,
  then gateless build. Phase A is gated like `init-project.md`: it reads
  the interpretation back, then builds the foundation (brief, architecture,
  backlog, contracts, scaffold) and fixes the stack + dependency policy,
  ending at a foundation sign-off gate. Phase B then runs without gates:
  stands up a runnable skeleton and burns down the first milestone via the
  `auto-jazz` loop. Runs the standard four-stage approach at two altitudes
  (project-altitude gated, item-altitude gateless) — no extra design
  stages. Inherits the auto-jazz hard prohibitions plus two of its own: no
  building past the first milestone in one run, and a greenfield dependency
  rule (only deps the recorded architecture names are authorised).

### Changed

- `pm_skills/GUIDE.md` — adds a "New project, and you want the agent to
  build it?" pointer under Start here, the `init-mvp.md` entry in the
  integrations file tree, and the previously-missing `prune-memory.md`
  integration row alongside it.
- `pm_skills/init.md` — adds a "Prefer to let the agent build it?" callout
  pointing at the guided-then-autonomous path.
- `pm_skills/integrations/init-project.md` — cross-references the
  guided-then-autonomous variant.
- `README.md` — notes the guided-then-autonomous path in Quick start.

### Upgrade actions

- Create `pm_skills/integrations/init-mvp.md` from the source. It is a new
  `framework` file — nothing to preserve; copy it in.
- Overwrite these `framework` files with the source versions, after the
  Step 4 customisation check: `pm_skills/GUIDE.md`, `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md`.
- `README.md`: most consuming projects keep their own root README — skip
  unless the project intentionally tracks the framework README.
- No `pm_skills/MANIFEST.md` change — `pm_skills/integrations/*` already
  classifies the new file as `framework`.
- No `project/` memory migrations.
- Bump `pm_skills/VERSION` to `1.2.0` (stamped by overwriting the framework
  `VERSION` file).
- Result: project is at **1.2.0**.

## 1.1.0 — 2026-05-30

Adds the wish-list: a cold-tier capture inbox for parking unscoped
ideas mid-task, with capture and triage rules plus the upgrade
handling needed to ship a brand-new project-memory file.

### Added

- `pm_skills/project/wish-list.md` (`project-memory`) — capture inbox
  for unscoped ideas. Cold tier (never auto-read); drained by triage
  into `backlog.md`. One line per idea; promote or cut at triage;
  soft cap ~25 open items.

### Changed

- `AGENTS.md` (`root-template`) — adds a "Capturing deferred ideas
  (wish-list)" section, a Cold read-tier entry, a memory-budget row,
  a Document-ownership update, and an anti-pattern.
- `pm_skills/prompts/next-batch.md` — adds a quick wish-list triage
  step (promote or cut) before picking the batch.
- `pm_skills/prompts/corrections.md` — adds a "Park it" capture
  trigger.
- `pm_skills/prompts/scoping.md` — routes worth-keeping out-of-scope
  items into the wish-list.
- `pm_skills/prompts/end-of-task.md` — counts open wish-list items in
  the size check and proposes triage (not archiving) when over budget.
- `pm_skills/prompts/prune-memory.md` — adds a wish-list action: drain
  by triage, never archive.
- `pm_skills/prompts/session-start.md` — lists the wish-list under
  Cold (do not auto-load).
- `pm_skills/prompts/upgrade.md` — Step 8 now creates a brand-new
  `project-memory` file from the template (never overwrites).
- `pm_skills/MANIFEST.md` — adds the `wish-list.md` → `project-memory`
  row.
- `pm_skills/GUIDE.md`, `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md` — document the wish-list in
  the file tree, read tiers, memory-fresh table, and init notes.

### Upgrade actions

- Create `pm_skills/project/wish-list.md` from the source template. It
  is a new `project-memory` file — nothing to preserve. **Skip if it
  already exists; never overwrite.**
- Overwrite these `framework` files with the source versions, after
  the Step 4 customisation check: `pm_skills/prompts/next-batch.md`,
  `corrections.md`, `scoping.md`, `end-of-task.md`, `prune-memory.md`,
  `session-start.md`, `upgrade.md`, `pm_skills/GUIDE.md`,
  `pm_skills/init.md`, `pm_skills/integrations/init-project.md`,
  `pm_skills/MANIFEST.md`.
- 3-way merge `AGENTS.md` (`root-template`): add the "Capturing
  deferred ideas (wish-list)" section, the Cold read-tier bullet, the
  `wish-list.md` budget row, the Document-ownership update, and the
  anti-pattern. Preserve every populated section verbatim.
- Bump `pm_skills/VERSION` to `1.1.0` (stamped by overwriting the
  framework `VERSION` file).
- Result: project is at **1.1.0**.

## 1.0.0 — 2026-05-28

First versioned release. Establishes self-describing metadata so
upgrades become a short declarative read instead of a full-tree
forensic diff. Prior copies of pm-skills were unversioned; treat any
project without a `pm_skills/VERSION` file as pre-1.0.0.

### Added

- `pm_skills/VERSION` — single-line semver. The upgrade fast-path
  check reads this first.
- `pm_skills/CHANGELOG.md` — this file.
- `pm_skills/MANIFEST.md` — classifies every framework path as
  `framework`, `root-template`, `project-memory`, or `scaffold`, so
  an upgrade never has to infer whether a file is safe to overwrite.
- `pm_skills/prompts/release.md` — maintainer-side release checklist
  that keeps `VERSION`, this changelog, and the manifest in sync.

### Changed

- `pm_skills/prompts/upgrade.md` — rewritten to read `VERSION`,
  `CHANGELOG.md`, and `MANIFEST.md` first: check versions and stop if
  equal, apply only the documented deltas when behind, and fall back
  to a full diff only for pre-1.0.0 (unversioned) projects. Adds a
  defensive check that surfaces locally-customised framework files
  before overwriting them, and records source + version provenance.
- `pm_skills/GUIDE.md`, `README.md` — document versioning and the new
  upgrade flow.

### Upgrade actions

For a project on a pre-1.0.0 (unversioned) copy:

- Copy the four new framework files into the project's `pm_skills/`:
  `VERSION`, `CHANGELOG.md`, `MANIFEST.md`, `prompts/release.md`.
- Overwrite `pm_skills/prompts/upgrade.md` and `pm_skills/GUIDE.md`
  (both `framework` class — but first run the Step 4 customisation
  check; some projects added local sections such as "Shell safety").
- `README.md`: most consuming projects keep their own root README —
  skip unless the project intentionally tracks the framework README.
- No `project/` memory migrations.
- Result: project is at **1.0.0**.
