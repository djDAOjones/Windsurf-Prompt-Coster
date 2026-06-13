# Next Batch

A `session-start` variant. Instead of you naming the task, this loads
project context, picks the next logical batch from the backlog,
presents it with a recommended workflow, and stops for your go-ahead.
No scoping, no code until you confirm.

A "batch" is the smallest shippable unit of work: a single backlog
item, or a tight cluster of items that share the same files or feature
and clearly belong together.

## 1. Load context

Load the standard project context exactly as
`pm_skills/prompts/session-start.md` describes (canonical hot-read
list and tier policy live in `AGENTS.md` → "Before every task").

`pm_skills/project/backlog.md` is the focus of this prompt — read its
**Active** section (Current milestone, Next milestone, and Icebox all
live there, per the standard tier policy).

Also read `pm_skills/project/wish-list.md` here. It is Cold tier
(never auto-loaded), and `next-batch` is its triage point — the one
prompt that always opens it.

## 2. Triage the wish-list (quick)

If `wish-list.md` has open items, drain it before picking work — this
is the forcing function that stops the inbox becoming a graveyard:

- List the open items, one line each.
- For each, recommend **promote** (move it into `backlog.md` under
  Current, Next, or Icebox) or **cut** (delete the line). When
  promoting, don't just append — place it *relative to* the items
  already in that section and say, in one line, whether it ranks
  above or below them and why. This keeps the pick in step 3 reading
  off a current order rather than a stale one.
- Apply only what the user confirms. Never auto-promote. Promoting
  moves the item out of the wish-list; cutting deletes it.
- If the wish-list is empty, say so in one line and move on.

Keep this quick — a triage glance, not scoping. Real scoping happens
in the chosen workflow after the pick.

## 3. Pick the next batch

From the backlog Active section, choose the next logical unit:

- Prefer continuing an in-progress item (`[~]`) over starting a new one.
- Otherwise take the first unstarted item (`[ ]`) under **Current
  milestone**.
- Fall back to **Next milestone** only if Current milestone is empty
  or fully done.
- Do not pull from **Icebox** unless Active has nothing committed.
- Skip blocked items and say why they're blocked.

## 4. Present the pick

Output, concisely:

1. **The batch** — the backlog item(s), quoted verbatim.
2. **Why it's next** — one or two lines (milestone order, dependency,
   or in-progress continuation).
3. **What it touches** — likely files or areas, grounded in a quick
   source-tree check. A pointer, not full scoping.
4. **Recommended workflow** — full 4-stage / quick / bug — with one
   line of rationale.
5. **Ready-to-paste task statement** — in the matching
   `session-start` form (Standard / Quick / Bug start).
6. **Runner-up** — in one line, the next item you'd pick if this one
   is wrong.

## 5. Stop

Wait for the user to confirm or redirect. Do not begin scoping,
planning, or writing code until they do.

Rules:

- Search the source tree only enough to ground the "what it touches"
  line. Save real scoping for the chosen workflow.
- If two or three candidates are genuinely equal, present them and ask
  the user to choose. Don't guess silently.
- If the backlog Active section is empty or unclear, say so and ask
  what to work on.
