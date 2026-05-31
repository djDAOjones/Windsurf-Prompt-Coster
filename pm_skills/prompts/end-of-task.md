# End of Task

Run this at the end of every task session, after implementation
and verification are complete. This is the canonical housekeeping
ritual. The integration workflows reference this file rather than
duplicating its contents.

## 1. Update project memory

Update each of the following if relevant to this task:

- `pm_skills/project/backlog.md` — move this task to the Completed
  section, note any follow-up tasks in Active.
- `pm_skills/project/wish-list.md` — append any out-of-scope ideas
  surfaced this task, one line each.
- `pm_skills/project/file-map.md` — add or update entries for files
  created or changed.
- `pm_skills/project/decision-log.md` — record the key design
  decision from this task.
- `pm_skills/project/conventions.md` — if new conventions were
  established or existing ones changed.
- `README.md` — if architecture, dev workflow, or key infrastructure
  changed significantly.
- `AGENTS.md` — if this task established new invariants, data model
  changes, protected modules, event namespaces, or anti-patterns.
  Check whether `AGENTS.md` still reflects current architecture and
  conventions.
- `UI-STANDARDS.md` — if this task established new token systems or
  UI conventions.
- `DEV-INFRASTRUCTURE.md` — if this task changed build, dev server,
  versioning, or script conventions.

## 2. Run the memory size check

Budgets are defined in `AGENTS.md` → "Memory size budgets". Do not
duplicate the numbers here.

- Word-count every hot whole-file read listed in `AGENTS.md` →
  "Read tiers" (`README.md`, the `pm_skills/project/` whole-file
  reads, `UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`, and any
  project-added hot reads), and sum them for the total-hot-set
  budget.
- Count Completed items in `backlog.md`.
- Count open items in `wish-list.md`.
- Count entries in `decision-log.md` and check the oldest entry's
  date.

If any budget is exceeded:

- Do not auto-prune.
- Output one line per overrun: which file (or the total hot set),
  which budget, current value.
- Exception: if only the `decision-log.md` age budget is exceeded
  and fewer than ~5 entries lie beyond the latest-10 floor, just
  note it — don't propose a prune. On low-velocity / sporadic
  projects the age budget trips repeatedly with little to archive;
  the entry-count and word budgets are the meaningful triggers.
- An over-budget `wish-list.md` is drained by triage, not archiving.
  Propose a triage pass (promote or cut) — via `next-batch.md` or
  `prune-memory.md` — rather than an archive split.
- Propose running `pm_skills/prompts/prune-memory.md` and wait for
  user approval.

## 3. Report

Output a one-line summary:

- Which memory files were updated.
- Which budgets were checked.
- Whether any tripped (and the proposal made if so).

Present the report to the user before closing the task.
