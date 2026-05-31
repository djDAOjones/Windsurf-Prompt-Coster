---
description: Run the diagnosis-before-fix workflow for a bug
---

Before fixing anything, diagnose the root cause and get user approval.
Do not write code until diagnosis is confirmed and a fix plan is approved.

1. State the bug.
   One sentence: what is happening vs what should be happening.
   Include reproduction steps if the user provided them.

2. Read project context.
   Load the standard project context per `AGENTS.md` → "Before every
   task". If `AGENTS.md` is not loaded as a global rule, read it now.
   Also read `pm_skills/project/backlog.md` (Active section) and
   `pm_skills/project/decision-log.md` (latest 10 entries). Read
   older entries on demand if the bug touches prior design decisions.

3. Triage complexity.
   Ask the user: "Is this a quick fix or does it need full diagnosis?"
   - If quick fix → go to step 4.
   - If full diagnosis → go to step 5.
   - If the user already indicated, don't ask again.

--- QUICK FIX PATH ---

4. Quick diagnosis and fix plan.
   Read `pm_skills/prompts/bug-scoping.md` and follow
   its instructions. Output:
   - Bug description (expected vs actual, reproduction steps if known)
   - Root cause — search the codebase and cite evidence
   - Proposed fix — minimal upstream change
   - Files to modify (with one-line reason each)
   - Acceptance criteria

   Present to the user. After approval, implement the fix.
   Go to step 8.

--- FULL DIAGNOSIS PATH ---

5. Reproduce and observe.
   Confirm the reproduction steps. If the bug is not reliably
   reproducible, note what conditions trigger it and what has been
   tried. Document:
   - Steps to reproduce (or best-known trigger)
   - Expected behaviour
   - Actual behaviour
   - Environment details if relevant

   Present to the user for confirmation before continuing.

6. Diagnose root cause.
   Read `pm_skills/prompts/bug-scoping.md` and follow
   its instructions. Search the codebase, trace the fault, and
   cite evidence. Output:
   - Root cause — state the cause, not the symptoms. Cite file
     paths and line ranges.
   - If the cause is uncertain, state competing hypotheses and
     what evidence would distinguish them.
   - Regression surface — what existing behaviour could break if
     this area is changed.

   Present diagnosis to the user. Wait for approval before
   continuing. Do not propose a fix until the root cause is
   confirmed.

7. Plan the fix.
   Output:
   - Proposed fix — the minimal upstream change that addresses
     the root cause
   - Files to modify (with one-line reason each)
   - Files not to touch
   - Regression checks or tests to run
   - Acceptance criteria — how we know the bug is fixed and no
     regressions were introduced

   Present to the user. After approval, implement the fix.

--- VERIFY ---

8. Verify the fix.
   After implementation:
   - Confirm the original bug is resolved against the reproduction
     steps or trigger conditions.
   - Check for regressions against the identified regression surface.
   - Run existing tests if a test runner is available.

   Report results to the user.

--- CLOSE ---

9. End-of-task housekeeping.
   Run the procedure in `pm_skills/prompts/end-of-task.md`: update
   project memory, run the size check, and present the closing
   report to the user.
