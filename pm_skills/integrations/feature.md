---
description: Run the design-before-code workflow for a task
---

Before implementing anything, complete the design workflow and get
user approval at each gate. Do not write code until all gates pass.

1. State the goal.
   One sentence: what the user asked for.

2. Read project context.
   Load the standard project context per `AGENTS.md` → "Before every
   task". If `AGENTS.md` is not loaded as a global rule, read it now.
   Also read `pm_skills/project/backlog.md` (Active section) and
   `pm_skills/project/decision-log.md` (latest 10 entries) for the
   current task context.

3. Determine task size.
   Ask the user: "Is this a full 4-stage task or a quick task?"
   - If quick → go to step 8.
   - If full → continue to step 4.
   - If the user already indicated the size, don't ask again.

--- FULL 4-STAGE WORKFLOW ---

4. Scoping (stage 1).
   Read `pm_skills/prompts/scoping.md` and follow
   its instructions. Output the scoping deliverables:
   - Problem framing
   - Affected areas
   - Key design decisions
   - Risks and dependencies
   - Smallest useful scope
   - Out of scope
   - Target file list
   - Open questions (only if genuinely blocking)

   Search the source tree to confirm affected files.
   Present scope to the user. Wait for approval before continuing.

5. Design options (stage 2).
   Read `pm_skills/prompts/design-options.md` and
   follow its instructions. Produce 2–3 design options with:
   - Summary, affected files, architectural fit, data flow, benefits,
     risks
   - A recommended option with rationale

   Present to the user. Wait for the user to pick an option.

6. Implementation plan (stage 3).
   Read `pm_skills/prompts/implementation-plan.md`
   and follow its instructions. Output:
   - Ordered file list with purpose
   - Data flow or architectural changes
   - New abstractions (with justification) or explicitly none
   - Tests to write or update
   - Step-by-step implementation sequence
   - Acceptance criteria
   - Watchouts
   - Files not to touch

   Present to the user. Wait for approval before continuing.

7. Validation (stage 4).
   Read `pm_skills/prompts/validation.md` and
   follow its instructions. Output:
   - Design sanity checks
   - Architecture checks
   - Regression risks
   - Test coverage assessment
   - Edge cases
   - Signs the scope is too large

   Present to the user. After approval, tell the user the design
   phase is complete and ask: "Ready to implement?"
   Wait for confirmation, then implement.
   Go to step 9.

--- QUICK TASK WORKFLOW ---

8. Quick scope and plan.
   Read `pm_skills/prompts/quick-task.md` and
   follow its instructions. Output:
   - What needs to change and why
   - Files to create or modify
   - Implementation sequence
   - Watchouts
   - Acceptance criteria

   Present to the user. After approval, implement.
   Go to step 9.

--- CLOSE TASK ---

9. End-of-task housekeeping.
   Run the procedure in `pm_skills/prompts/end-of-task.md`: update
   project memory, run the size check, and present the closing
   report to the user.
