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
