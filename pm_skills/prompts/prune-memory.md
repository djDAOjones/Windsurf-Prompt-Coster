# Prune Memory

Run this when the end-of-task size check flags any project memory
file over budget, or when the user requests a memory prune.

Budgets are defined in AGENTS.md → "Memory size budgets". Do not
duplicate the numbers here — read them from AGENTS.md.

This procedure is single-pass and minimises its own meta-cost. Use
plain shell (`wc`, `head`, `tail`, `grep`, `cp`, `mv`, output
redirection). No Python scripts. No retry loops. If a step fails,
stop and report.

## 1. Detect

Word-count every hot whole-file read listed in `AGENTS.md` →
"Read tiers" — `README.md`, the `pm_skills/project/` whole-file
reads, `UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`, and any
project-added hot reads — and sum them for the total-hot-set
budget. Count Completed items in `backlog.md`. Count entries and
the oldest entry date in `decision-log.md`. Count open items in
`wish-list.md`.

Output a short table:

| File | Metric | Current | Budget | Status |

This is the **before** snapshot.

## 2. Propose

For each over-budget file, propose one specific action:

- `file-map.md` over budget → strip historical and batch notes,
  keep current roles only. Move stripped content to
  `pm_skills/project/archive/file-map-YYYY-MM-DD-historical.md`.
- `architecture.md` or `conventions.md` over budget → propose
  tightening or splitting; usually content belongs in
  `decision-log.md` or in a new permanent contract file.
- `brief.md` over budget → propose tightening (rare).
- `backlog.md` Completed > budget → move all but the most recent 30
  items to `archive/backlog-shipped.md`. Keep Active untouched.
- `decision-log.md` > entry budget OR oldest > age budget → archive
  the oldest entries, keeping the latest live (at least the
  read-tier latest 10, ideally a generous margin above it). Default
  split is by whole month into `archive/decision-log-YYYY-MM.md`.
  If a single month alone exceeds the entry budget, split that
  month by date-range instead, into
  `archive/decision-log-YYYY-MM-DD-to-YYYY-MM-DD.md`, oldest
  entries first. Leave a one-line index at the bottom of the live
  file pointing at each archive file. If only the age budget is
  tripped (not the entry budget) and fewer than ~5 entries lie
  beyond the latest-10 floor, note the overrun and skip — the
  archive gain doesn't justify the prune (common on low-velocity /
  sporadic projects).
- `wish-list.md` over budget → do **not** archive. Propose a triage
  pass: for each open item, promote it into `backlog.md` (Current,
  Next, or Icebox) or cut it. Survivors move to the backlog; cuts are
  deleted. The file shrinks by triage, not by moving content to
  `archive/`.
- Total hot whole-file set over budget → propose a memory-wide
  review: archive or tighten the largest hot files using the
  per-file actions above. Do not blanket-trim files already under
  their own budget.

Present the proposal to the user. Wait for approval. Do not skip.

## 3. Backup (conditional)

Run `git status --porcelain` on the project root.

- If output is empty (working tree clean), skip explicit backup —
  git history is sufficient.
- If output is non-empty, copy each file to be modified into
  `pm_skills/project/archive/backup-YYYY-MM-DD-HHMM/` first.

## 4. Execute

For each approved prune, work non-destructively first — build the
new files alongside the original, verify, then swap:

- Create `pm_skills/project/archive/` if it does not exist.
- Build the archive file from the original's verbatim slice (e.g.
  `tail -n +N "$SRC" > "$ARCHIVE"`) plus a short archive header.
  Preserve append-only entries verbatim — never rewrite.
- Build the trimmed live file into a temp (e.g. `"$SRC.tmp"`): the
  kept content plus, for `decision-log.md`, a one-line index entry
  at the bottom for each archive file, in the form
  `## Archived: 2026-04 — see archive/decision-log-2026-04.md` (or
  `## Archived: 2026-05-02 → 2026-05-20 — see archive/…` for a
  date-range split).
- Run the step 5 `diff` checks against the still-intact original
  BEFORE swapping. Only swap once they prove the split is lossless:
  `mv "$SRC.tmp" "$SRC"`.

Keep each shell command simple and single-purpose — large compound
`{ … }` blocks with inline comments get mangled in the terminal.
Batch the prunes, but do not iterate file-by-file with confirmation
prompts.

## 5. Verify

- Re-run word and entry counts. Confirm all files are now under
  budget (or at the agreed generous target).
- Prove append-only entries are unchanged byte-for-byte with
  `diff`, run against the still-intact original before the step 4
  swap: `diff <(tail -n +N "$SRC") <(tail -n +M "$ARCHIVE")` for the
  archived slice and `diff <(head -n K "$SRC") "$SRC.tmp"` for the
  kept slice — both must report no differences.
- Reconcile counts: archived + kept must equal the original total.
  Nothing is lost.
- Confirm archive files exist with the moved content, and the live
  file's index pointer(s) resolve to them.
- Confirm `backlog.md` Active section is untouched.
- If counts don't reconcile, or a file you did not prune shows as
  modified, suspect a concurrent edit from a parallel task — stop,
  report it, and do not "fix" it. It is not part of the prune.
- Output a before / after table.

## 6. Record

- Append a one-line entry to `decision-log.md` (top, append-only):
  the date, "Pruned project memory", and a one-line summary of
  what was archived (e.g. "decision-log April 2026 → archive,
  backlog 60 shipped → archive").
- If new archive files were created, add them to
  `pm_skills/project/file-map.md` under a new "Archive" section
  if one does not already exist.
- Stage any new archive files with `git add <archive-file>` so the
  moved history isn't left untracked and lost. Leave committing to
  the user.

## Rules

- Append-only files (`decision-log.md`): move entries verbatim.
  Never rewrite. Never collapse. Never summarise on archive.
- Live files keep the latest content; archives keep history.
- Archives are append-only too — never rewrite an existing archive.
- If multiple files exceed budget, prune them all in one pass to
  avoid multiple sessions of meta-cost.
- If unsure whether to archive a piece of content, leave it in the
  live file. False positives are worse than false negatives —
  content can always be archived next session.
- Tier names ("hot whole-file", "hot sectional", "cold") and
  budget numbers come from AGENTS.md only. Do not redefine here.
