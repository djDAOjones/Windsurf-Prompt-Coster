# Upgrade

Run this when a project is on an older version of pm-skills and needs
the latest framework files (prompts, integrations, init, GUIDE,
scaffold, and the metadata files `VERSION`, `CHANGELOG.md`,
`MANIFEST.md`) plus any new sections in the root templates
(`AGENTS.md`, `UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`).

This procedure is version-aware. It reads the framework's own
metadata first and only does real work when there is a version gap —
no full-tree diff unless the project predates versioning. It is
destructive in places: always propose before executing, never
silently overwrite user-populated content, and never delete anything
in `pm_skills/project/` or `pm_skills/project/archive/`.

## 0. Locate the latest version

Ask the user for the source of the latest pm-skills if they have not
already provided one. Acceptable sources:

- A local checkout (e.g. `../pm-skills/` or `~/code/pm-skills/`).
- A Git URL the agent can clone or fetch.
- The user pasting individual files into the chat.

From the source, read `pm_skills/VERSION`, `pm_skills/CHANGELOG.md`,
and `pm_skills/MANIFEST.md` first — these three drive the whole
procedure. If pasting, request them in that order, then only the
specific files the changelog later names.

## 1. Version check (fast path)

Read the project's own `pm_skills/VERSION`.

- **Equal to the source version** → the project is already current.
  Report "already on X.Y.Z, nothing to do" and STOP. No diff, no
  clone of the rest, no further steps.
- **Behind the source** → note the gap (e.g. `1.0.0 → 1.3.0`) and
  continue to Step 2.
- **Missing** → the project predates versioning (pre-1.0.0). Skip to
  the **Legacy path** at the bottom of this file.
- **Ahead of the source** → the source is stale or the two have
  diverged. Do not downgrade. Surface this and ask the user which is
  canonical before doing anything.

## 2. Build the work list from the changelog

Read every `CHANGELOG.md` entry **newer than the project's version**,
up to and including the source version. Concatenate their **Upgrade
actions** blocks in order, oldest first. That ordered list is the
entire plan — there is no need to diff the trees.

Present the work list as a short table:

| Version | Path | Action | Class |
| --- | --- | --- | --- |

STOP. Wait for approval before changing anything.

## 3. Classify each path with the manifest

For every path in the work list, look up its class in the source
`pm_skills/MANIFEST.md`:

- `framework` → overwrite wholesale (subject to the Step 4 check).
- `root-template` → 3-way merge, preserving populated sections
  (Step 6).
- `project-memory` → never overwrite; additive section reconcile
  only (Step 7).
- `scaffold` → never touched on upgrade; skip.

If a path in the work list is not covered by the manifest, treat it
as the directory default (`prompts/` and `integrations/` are
`framework`; `project/` is `project-memory`) and note the gap so the
maintainer can add a row upstream.

## 4. Customisation check (before overwriting framework files)

For each `framework`-class file the work list will overwrite, diff
the project's current copy against the source version of that file.
Every difference must fall into one of:

- **Explained by the changelog** — the Upgrade actions account for
  it. Safe to overwrite.
- **Unexplained** — the project has a *local customisation* to a
  framework file (for example, a "Shell safety" section added to
  `upgrade.md` or `end-of-task.md`). STOP. Surface each unexplained
  file and ask: re-apply the local change on top of the new version,
  or discard it?

Never silently overwrite an unexplained difference. Framework files
are not meant to be edited in place — recommend the user move any
durable local rule into a `root-template` (`AGENTS.md`,
`UI-STANDARDS.md`, or `DEV-INFRASTRUCTURE.md`), which survives every
future upgrade. Record the decision in Step 10.

## 5. Backup (conditional)

Run `git status --porcelain` on the project root.

- If output is empty (working tree clean), skip explicit backup —
  git history is sufficient.
- If output is non-empty, copy every file that will be modified or
  deleted into
  `pm_skills/project/archive/upgrade-backup-YYYY-MM-DD-HHMM/`
  before continuing.

## 6. Apply framework changes

For approved `framework`-class items:

- Overwrite each changed file with the source version.
- Add each new file from the source.
- Re-apply any local customisation approved for carry-over in Step 4.
- Delete files removed upstream **only with per-file confirmation**.
  Do not batch-delete.

The work list was already approved — do not pause between individual
overwrites. Batch them. `pm_skills/VERSION` is itself a framework
file: overwriting it stamps the project at the new version.

**VERSION exception when a migration is pending.** If the work list
includes a major-version memory migration (Step 8), **exclude
`pm_skills/VERSION` from this batch** and hold it at the old number
through the framework sync. Stamp it to the new version **only after the
Step 8 reconcile passes**, so a half-finished migration never leaves a
project falsely claiming the new version.

## 7. Merge root templates

Only if the work list touches `AGENTS.md`, `UI-STANDARDS.md`, or
`DEV-INFRASTRUCTURE.md`:

- Use the latest template as the base structure.
- Port every populated section from this project into the matching
  section of the new template. **Preserve wording exactly.** Do not
  paraphrase, summarise, or "improve" the user's content.
- New sections this project never populated keep their
  `<!-- CUSTOMISE -->` markers.
- If a section the user populated no longer exists upstream, do not
  delete it — surface it and ask where the content should move.
- Show a unified diff per file before writing. Write after approval.

## 8. Reconcile project memory templates

Only if the work list flags a new `project-memory` file, or
new/renamed/removed sections in the distributed `pm_skills/project/`
templates. For each affected file:

- New `project-memory` file upstream (the changelog names it, e.g. a
  new `pm_skills/project/wish-list.md`) → create it in the project
  from the source template. There is nothing to preserve; it starts
  at the template. Skip if it already exists — never overwrite.
- New sections upstream → add the heading with no body content.
- Renamed headings → leave the user's content under the existing
  heading and surface the rename for the user to apply manually. Do
  not auto-rename.
- Removed sections upstream → do nothing. Never delete user content.

**Major-version memory migrations.** When a changelog entry calls for
*relocating* project-memory content — not just adding a file or section,
but moving content (e.g. shipped work out of `backlog.md` into a new
`trajectory.md`) — treat it as a one-time, approved, lossless data
migration. The changelog entry names the *specific* moves; the mechanics
below make them safe and are the same every time:

1. **Snapshot first.** Copy each file being restructured, verbatim, to
   `archive/<dir>/<file>-pre-vNEW-YYYY-MM-DD.md`, and `diff -q` the copy
   against the original to confirm it is byte-identical. This snapshot is
   the safety net — no later step can lose anything it holds.
2. **Propose the whole move.** Show a from → to table (what content
   leaves which file and where each piece lands) alongside the changelog
   entry's specific steps. (Optional pre-flight: a read-only
   `doctor-memory.md` pass here surfaces status drift — stale `[ ]`,
   duplicates — before anything moves; `roadmap-refactor.md`'s findings
   pass also catches these, so skip it if you prefer.) STOP for sign-off.
3. **Execute.** First scan `archive/` for any pre-existing shipped /
   trajectory archives (e.g. a `backlog-shipped.md` left by an earlier
   prune) and align with them — reference them from `INDEX.md`, never
   duplicate their content into a new chunk. Then relocate each item as
   one compressed line that **starts with its ID**, confirming its detail
   already lives in its canonical home (e.g. the *why* in
   `decision-log.md`). When a destination spans multiple epochs, split it
   into sequential `-NNNN-` chunks on the epoch boundary (browsability,
   not size). Create or refresh `archive/INDEX.md`.
4. **Reconcile (the lossless proof).** Build the ID set from the snapshot
   by taking the **leading item ID of each shipped line** (the first
   token of every `- [x] **ID** …` line), and the ID set of the new homes
   by taking the **leading token of each `- ID — …` line** in the
   trajectory union. Anchor to line starts — never grep IDs from anywhere
   in the line, or bolded prose (`**Client-only**`) and IDs mentioned
   inside other items create false positives that bury a real omission.
   The set difference must be **empty** — a clean pass/fail, not a list to
   triage. Then confirm zero stragglers in the source (e.g. zero `[x]`
   left in `backlog.md`) and that the snapshot is still byte-identical.
   Report before/after word and item counts.

Never delete content not yet confirmed in its new home. This is the one
exception to "never overwrite project memory": it restructures with
approval, losslessly. Once the reconcile passes, stamp `pm_skills/VERSION`
to the new version (the Step 6 exception), then record the reconciliation
result in Steps 10–11.

## 9. Readiness check

Run the placeholder lint from the latest `pm_skills/init.md` Step 10:

```sh
grep -nE '\[Project Name\]|\[short product description\]|<!-- CUSTOMISE' \
  AGENTS.md UI-STANDARDS.md DEV-INFRASTRUCTURE.md 2>/dev/null
```

Classify every remaining hit as:

- **(i) Genuinely not applicable** — leave as a deliberate stub.
- **(ii) New in this version, needs population** — point the user at
  the matching `init.md` step (Steps 6–8) for a follow-up session.

## 10. Record

Append one entry to the top of `pm_skills/project/decision-log.md`
(append-only). Include, on one line each:

- Date and "Upgraded pm-skills framework".
- **Version:** `OLD → NEW`.
- **Source:** where the upgrade came from (Git URL or local path) —
  this is the provenance that makes future source divergence visible.
- A brief summary of what changed (new prompts, merges, migrations).
- Any local framework customisation decision from Step 4 (carried
  over, discarded, or moved to a root template).

## 11. Report

Output a final upgrade report:

- Version moved `OLD → NEW`.
- Framework files replaced/added (count + notable additions).
- Root templates merged (one line per file).
- Project memory migrations applied (or "none").
- Local customisations handled (or "none").
- Outstanding placeholders by category.
- Backup location (if taken).

## Legacy path (project has no `VERSION` file)

A pre-1.0.0 project carries no metadata, so reconstruct it once:

1. Diff the project's `pm_skills/` against the source tree
   (`diff -rq` on `prompts/`, `integrations/`, `scaffold/`,
   `project/`, plus the top-level files).
2. Classify every differing, new, or removed path using the source
   `MANIFEST.md` (Step 3), then run Steps 4–9 as normal.
3. In Step 6, also copy in the new metadata files (`VERSION`,
   `CHANGELOG.md`, `MANIFEST.md`) so this project is versioned from
   now on and never needs the legacy path again.
4. Record the upgrade (Step 10) and report (Step 11).

## Rules

- Treat the source `VERSION`, `CHANGELOG.md`, and `MANIFEST.md` as
  authoritative. The changelog's Upgrade actions are the plan; the
  manifest is how each path is handled.
- Never silently overwrite user-populated content in root templates
  or `pm_skills/project/`, and never overwrite an unexplained local
  change to a framework file without asking (Step 4).
- Never delete files in `pm_skills/project/` or
  `pm_skills/project/archive/`.
- Append-only files (`decision-log.md`, `CHANGELOG.md`) are never
  rewritten — only appended to.
- All non-trivial changes batched and shown before write.
- If a changelog entry's Upgrade actions are ambiguous or a section
  was both renamed and restructured, ask the user. Do not guess.
