---
description: Run a fast two-stage workflow without approval gates
---

Compressed two-stage workflow for small or low-risk tasks. No
approval gates.

- **Stage 1** — quick scope and implementation plan in one pass.
- **Stage 2** — implementation, validation against acceptance criteria,
  verification with build/tests, and project-memory housekeeping.

Where the gated workflows would wait for the user to approve scope or
plan, instead make the best conservative decision, state the
assumption in one line, and continue. Only stop to ask the user a
question if there is a genuinely blocking ambiguity that cannot be
safely assumed.

Conservative defaults to use when no user input is available:

- Prefer the smallest useful scope.
- Prefer existing patterns and existing files over new abstractions.
- Prefer reversible changes; flag irreversible ones explicitly.
- If the task is clearly larger than a quick task while planning,
  stop and recommend switching to `auto-jazz` (or `feature.md` if the
  user wants approval gates).

Hard prohibitions (stop and ask before doing any of these, even in
auto-jazz-lite mode):

- Adding a runtime dependency.
- Modifying a file listed in `AGENTS.md` → "Files to never edit" or
  `DEV-INFRASTRUCTURE.md` → "Files agents must not hand-edit".
- Modifying a module listed in `AGENTS.md` → "Protected
  infrastructure" (if that section is populated).
- Destructive migrations, schema-altering operations, or data
  deletion.
- Refactors touching more than 5 files that were not explicitly in
  the stated scope.
- Disabling, weakening, or deleting an existing test.

If any of these is needed, stop and ask one concise question. Do
not proceed on assumption.

1. State the goal.
   One sentence: what the user asked for.

2. Read project context.
   Load the standard project context per `AGENTS.md` → "Before every
   task". If `AGENTS.md` is not loaded as a global rule, read it now.
   Also read `pm_skills/project/backlog.md` (Active section) and
   `pm_skills/project/decision-log.md` (latest 10 entries) for the
   current task context.

--- STAGE 1: SCOPE + PLAN (no approval gate) ---

3. Combined scope and plan.
   Read `pm_skills/prompts/quick-task.md` and follow
   its instructions. Search the source tree to confirm affected files
   before writing the plan. Output:
   - What needs to change and why
   - Files to create or modify, with one-line purpose each
   - Step-by-step implementation sequence
   - Watchouts
   - Acceptance criteria

   State the chosen scope in one line as an assumption and continue
   to Stage 2. Do not wait for approval.

--- STAGE 2: IMPLEMENT + CLOSE (no approval gate) ---

4. Implement.
   Implement the plan from step 3. Follow the minimal-change
   discipline in `AGENTS.md`. Keep imports at the top of files.
   Match existing style. Do not introduce runtime dependencies
   without an explicit assumption noted in step 3.

5. Validate against acceptance criteria.
   Re-read the acceptance criteria from step 3 and confirm each one
   is met by the changes. If a criterion cannot be met, stop and
   report which one and why before continuing.

6. Verify with build and tests.
   - Run the project's build and test steps if available. If not,
     verify manually and note what was checked.
   - Check the watchouts from step 3 — confirm none have triggered.
   - Report what was run, what passed, and any open issues.

--- CLOSE TASK ---

7. End-of-task housekeeping.
   Run the procedure in `pm_skills/prompts/end-of-task.md`. When
   recording any decision-log entry, include the assumption made in
   step 3 (combined scope-and-plan). Present the closing report to
   the user.
