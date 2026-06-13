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

Word-count each hot whole-file read listed in `AGENTS.md` →
"Read tiers": the reference docs (`README.md`, `brief.md`,
`architecture.md`, `conventions.md`, + any project-added standards /
process / infra docs) against their soft per-doc guideline, and
`file-map.md` against its hard accreting budget. Do **not** sum them
into a single hot-set cap — there is no aggregate word budget (see
AGENTS.md). Count the backlog **Active** words and open items, and any
shipped `[x]` items still in `backlog.md` — anchor the count to list
items (`grep -cE '^\s*[-*] \[x\]'`) so the status-legend line is not a
false positive. Word-count `trajectory.md`. Count both entries and
words in `decision-log.md`, plus the oldest entry date. Count open
items in `wish-list.md`. For `archive/` files, note only whether a chunk spans more than one
epoch (multiple months, or across a migration boundary) — size is not a
trigger; cold archives are never auto-read (grep + line-range only).

Output a short table:

| File | Metric | Current | Budget | Status |

This is the **before** snapshot.

## 2. Propose

For each over-budget file, propose one specific action:

- `file-map.md` over budget → strip historical and batch notes (task
  tags, dates, test counts), keep current roles only. Move stripped
  content to
  `pm_skills/project/archive/file-map-YYYY-MM-DD-historical.md`. The
  floor is the irreducible current-role list; on a large codebase that
  may still exceed 2,000 words — strip noise, not signal, and stop there
  rather than gutting real roles to hit the number.
- `architecture.md` or `conventions.md` over budget → propose
  tightening or splitting; usually content belongs in
  `decision-log.md` or in a new permanent contract file.
- `brief.md` over budget → propose tightening (rare).
- `[x]` items in `backlog.md` (shipped work that never left) → for
  each, compress to a one-line outcome under the current phase of
  `trajectory.md` and confirm the WHY is in `decision-log.md`, then
  remove it from the backlog. A legacy `## Completed` section migrates
  the same way, then the heading is removed.
- `backlog.md` Active over budget → this is structural, not just size.
  Recommend `roadmap-refactor.md` (regroup by lifecycle, dedupe stale
  rounds, evict done-work). Prune may still relocate obvious done-work
  per the rule above, but leave the re-sequencing to the refactor.
- `trajectory.md` over budget → move the oldest phases verbatim to
  `archive/trajectory/trajectory-NNNN-YYYY-MM-DD-to-YYYY-MM-DD.md`
  (sequence-numbered), keeping recent phases live. Add an
  `archive/INDEX.md` row.
- `decision-log.md` > entry budget OR > word budget OR oldest > age
  budget → archive the oldest entries, keeping the latest live (at
  least the read-tier latest 10, ideally a generous margin above it).
  Default split is by whole month into `archive/decision-log-YYYY-MM.md`.
  If a single month is genuinely unwieldy to grep, sub-split it by
  date-range into `archive/decision-log-YYYY-MM-DD-to-YYYY-MM-DD.md`,
  oldest entries first — but size alone isn't a reason to split; an
  epoch stays one file unless browsability demands otherwise. Leave a one-line index
  at the bottom of the live file pointing at each archive file. If only
  the age budget is tripped (not the entry or word budget) and fewer
  than ~5 entries lie beyond the latest-10 floor, note the overrun and
  skip — the archive gain doesn't justify the prune (common on
  low-velocity / sporadic projects).
- `wish-list.md` over budget → do **not** archive. Propose a triage
  pass: for each open item, promote it into `backlog.md` (Current,
  Next, or Icebox) or cut it. Survivors move to the backlog; cuts are
  deleted. The file shrinks by triage, not by moving content to
  `archive/`.
- `archive/` chunk spanning multiple epochs → optionally split on the
  epoch boundary (month / migration) for INDEX browsability, oldest
  first. Size is not a trigger — a single epoch stays one file however
  large, since cold archives are grepped, not loaded whole. Never
  rewrite the entries themselves; only divide the file. Update
  `archive/INDEX.md`.
- A **reference doc** (`README`, `brief.md`, `architecture.md`,
  `conventions.md`, project standards/process/infra) over its soft
  guideline → reference docs are **not** prune targets; they don't
  accrete. Leave it unless genuinely bloated, in which case propose
  tightening it or splitting detail into a permanent contract file —
  never strip it to hit a number.
- Every-task read load feels heavy → there is no aggregate word cap to
  "fix". Propose a structural review: is a reference doc bloated (tighten
  per above), should a hot read move to **conditional** or **warm**, or
  is `file-map.md` carrying accreted history (strip per above)? Do not
  blanket-trim files already within their own budget/guideline.

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
- Confirm the backlog Active open items are unchanged — except any
  `[x]` done-work intentionally relocated to `trajectory.md` this pass.
- If counts don't reconcile, or a file you did not prune shows as
  modified, suspect a concurrent edit from a parallel task — stop,
  report it, and do not "fix" it. It is not part of the prune.
- Output a before / after table.

## 6. Record

- Append a one-line entry to `decision-log.md` (top, append-only):
  the date, "Pruned project memory", and a one-line summary of
  what was archived (e.g. "decision-log April 2026 → archive,
  12 shipped items → trajectory").
- Maintain `pm_skills/project/archive/INDEX.md` (create it if missing):
  add a row per new or split archive file — filename, type
  (decision-log / trajectory / file-map / backup), date range or
  sequence number, entry/word count, and a one-line description. Put an
  entry/word count only on **frozen archive rows**, never on a live-file
  row (e.g. `../decision-log.md (live)`) — the count goes stale the
  moment this prune appends its own record entry. The INDEX is the
  browsable map of cold storage; keep it current so a reader never has
  to open a chunk to know what it holds.
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
- Archives are append-only too — never rewrite an existing archive's
  entries. Splitting a chunk on an epoch boundary into smaller
  sequential chunks is allowed (it divides the file, it does not rewrite
  entries) and must update `archive/INDEX.md`.
- If multiple files exceed budget, prune them all in one pass to
  avoid multiple sessions of meta-cost.
- If unsure whether to archive a piece of content, leave it in the
  live file. False positives are worse than false negatives —
  content can always be archived next session.
- Tier names ("hot whole-file" — reference / accreting / conditional —
  "hot sectional", "warm", "cold") and budget numbers come from
  AGENTS.md only. Do not redefine here.
