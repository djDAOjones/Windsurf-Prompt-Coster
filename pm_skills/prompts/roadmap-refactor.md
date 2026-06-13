# Roadmap Refactor

Run this when the roadmap has drifted: the backlog has grown into many
dated rounds, completed work is mixed in with open work, items duplicate
or contradict each other, or `next-batch` can no longer answer "what's
next" at a glance. Also run it when `doctor-memory.md` or the end-of-task
size check flags the backlog Active section over budget.

This **repairs the map**. It does not pick the next task (`next-batch.md`)
and it does not archive history by size (`prune-memory.md`). It
reorganises open work by lifecycle and dependency, and evicts anything
that is no longer open work.

Budgets and tier names come from `AGENTS.md` -> "Memory size budgets" and
"Read tiers". Do not restate the numbers here.

## 1. Load

- `pm_skills/project/backlog.md` — the whole file (not just Active; you
  are repairing the structure, including any drift below Active).
- `pm_skills/project/wish-list.md` — the capture inbox.
- `pm_skills/project/trajectory.md` — latest phase only, to see what
  already shipped (so you can spot done-work still sitting in the backlog).
- `pm_skills/project/decision-log.md` — latest entries, for context on
  recent calls and blockers.

## 2. Diagnose

Produce a short findings list. Look for:

- **Done-work in the backlog** — any `[x]` item, or any item whose
  outcome is already in `trajectory.md`. These must leave the backlog.
- **Stale history sections** — dated "round" / "follow-up" / "triage"
  headings kept only as an audit trail. The audit trail belongs in the
  decision-log and trajectory, not in the live backlog.
- **Duplicates and supersedes** — two items asking for the same thing;
  an item overtaken by a shipped change.
- **Blocked chains** — `[blocked: X]` / `after X` dependencies; surface
  the order they unblock in.
- **Contradictions and stale status** — items that disagree with the
  decision-log or with shipped reality.
- **Intent gaps** — non-trivial open items with no statement of intent
  or acceptance condition (see the ticket grammar in step 4).

## 3. Propose (diff-style, before write)

Present a single proposal the user can approve in one read:

1. **Cleaned queue** — the open items, regrouped into the backlog
   Active lifecycle (Current / Next / Icebox) and ordered by dependency.
2. **Evictions** — done-work to move to `trajectory.md` (one line each)
   and stale history sections to drop (already captured in the log).
3. **Merges / cuts** — duplicates folded; dead items cut, with reason.
4. **Promotions** — wish-list items worth pulling in, placed relative to
   existing items with a one-line above/below rationale.
5. **Open decisions** — anything that needs a maintainer call.

Show it as a before -> after for the backlog structure. STOP. Wait for
sign-off. Never rewrite the roadmap silently.

## 4. Apply (after sign-off)

- Rewrite the backlog Active section to the cleaned queue. Keep open
  items' wording; only restructure, reorder, and regroup.
- Move done-work to `trajectory.md`, compressed: `ITEM-ID — outcome
  (date) — see decision-log`. Start the line with the ID; never paste the
  implementation prose. When one line covers a group of sub-items, spell
  out each ID (`WL-19a, WL-19b, … WL-19h`) rather than a range, so every
  shipped ID stays individually greppable for a reconcile.
- Drop stale history sections only once their content is confirmed to
  live in the decision-log / trajectory. If unsure, leave it.
- Apply only the promotions and cuts the user confirmed.

Non-trivial open items use a tiny ticket grammar — enough to survive
future compression, never an essay:

```md
- **ITEM-ID Short title** `[flags]`
  Intent: the outcome wanted.
  Done when: the acceptance condition.
```

`Scope:` and `Risks:` lines are optional — add them only for sign-off or
invariant-changing items. Quick one-line items stay one line.

## 5. Record

- Append one entry to `decision-log.md` (top): date, "Roadmap refactor",
  and a one-line summary of what moved, merged, and was cut.
- If done-work moved to `trajectory.md`, note it.
- Stage new/changed memory files with `git add`. Leave committing to the
  user.

## Rules

- This is a structural repair, not a re-prioritisation by deadline.
  Order by dependency unless the user says otherwise.
- Never delete an item's intent. Cutting is explicit and reasoned;
  history moves to the trajectory/log, it is not erased.
- Preserve append-only files (`decision-log.md`, `trajectory.md` archives)
  verbatim when moving entries.
- If the backlog is already lean and lifecycle-clean, say so and stop.
