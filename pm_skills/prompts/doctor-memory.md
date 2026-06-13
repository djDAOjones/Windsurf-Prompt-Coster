# Doctor Memory

A read-only health check for project memory. Run it periodically on a
mature project, when resuming after a long gap, or when memory "feels"
noisy. It diagnoses drift the end-of-task size check cannot see, then
proposes the right repair workflow. It never edits files itself.

The end-of-task size check catches *word and entry budgets*. This catches
*structural* drift: done-work in the wrong place, stale paths, duplication,
version lag, and oversized archives.

Budgets and tier names come from `AGENTS.md` -> "Memory size budgets" and
"Read tiers". Read them from there; do not restate the numbers.

Use plain shell (`wc`, `grep`, `ls`, `sed`). No scripts, no edits.

## Checks

Run each check and record a row: **Check | Status (OK / WARN / FAIL) |
Detail | Proposed action**.

1. **Budgets** — word-count `file-map.md` (hard accreting budget) and
   each reference doc (soft per-doc guideline); count backlog Active
   words and open items; count decision-log entries and live words and
   oldest-entry age; count trajectory words; count wish-list open items.
   Compare against AGENTS.md budgets — there is no aggregate hot-set cap.
   FAIL on an accreting or sectional overrun (action: `prune-memory.md`);
   a reference doc over its soft guideline is a WARN, not a FAIL (not a
   prune target — tighten or split only if genuinely bloated).

2. **Done-work in the backlog** — `grep -cE '^\s*- \[x\]'
   pm_skills/project/backlog.md`. In v2 the backlog holds open work
   only; shipped items belong in `trajectory.md`.
   WARN/FAIL if any `[x]` present, or if a `## Completed` section
   exists. Action: `roadmap-refactor.md`.

3. **Backlog hygiene** — count dated "round" / "follow-up" / "triage"
   history headings under Active. Many such sections = the backlog is
   doubling as an audit trail.
   WARN past a handful. Action: `roadmap-refactor.md`.

4. **Stale file-map paths** — for each `path` referenced in
   `file-map.md`, check it exists on disk. List any that no longer
   resolve (deleted/renamed without a map update).
   FAIL on any missing path. Action: update `file-map.md`.

5. **Cross-file duplication** — sample the largest backlog items and
   decision-log entries; flag where the same prose appears in both
   (a completed item narrated in full in the backlog *and* the log).
   WARN. Action: compress the backlog/trajectory side to a pointer.

6. **Archive hygiene** — confirm `archive/INDEX.md` exists and lists
   every file in `archive/`; confirm INDEX rows resolve to real files;
   note any chunk that spans more than one epoch (a browsability nicety,
   not a size check — cold archives are never auto-read).
   WARN on a missing/stale INDEX; a multi-epoch chunk is INFO only.
   Action: `prune-memory.md` (rebuild INDEX / split on epoch boundary).

7. **Version drift** — read `pm_skills/VERSION`. If a framework source
   is available, compare to its `VERSION`. If behind, note the gap.
   WARN if behind. Action: `prompts/upgrade.md`.

8. **ADR / decision status** (only if the project uses ADRs or a status
   field) — best-effort grep for decisions referenced as final whose
   source still reads "Proposed"/"Draft". Surface mismatches; do not
   resolve them.
   WARN. Action: maintainer review.

## Report

- Output the health table, FAILs first.
- Below it, a short prioritised action list grouping checks by the
  workflow that fixes them (e.g. "Run `roadmap-refactor.md` — addresses
  checks 2, 3, 5").
- If everything is OK, say so in one line and stop.

## Rules

- Read-only. Doctor diagnoses and proposes; it never edits memory.
- Propose the workflow, then let the user run it (or approve running it).
- A check that does not apply to this project (no ADRs, no framework
  source to compare) is reported "n/a", not failed.
- Keep it cheap — single-pass counts and greps, no deep file reads
  beyond the samples check 5 needs.
