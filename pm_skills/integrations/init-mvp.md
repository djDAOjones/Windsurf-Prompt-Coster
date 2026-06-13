---
description: Sign off the foundation, then autonomously build the first-milestone MVP
---

The guided-then-autonomous path. Marries `init-project.md` (gated
foundation) with `auto-jazz.md` (gateless execution): you review and
**sign off the foundation** — the product read, the stack, and the MVP
backlog — and then the agent builds the first-milestone MVP to completion
without further gates.

Use this when you have wants or specs (loose is fine) and want to steer the
*what* and the *how much* once, then hand the build off. It applies the
same rigour and opinions as the rest of the framework — design-before-code,
Carbon, WCAG 2.2 AAA, minimal dependencies, live project memory.

The one gate sits where the leverage is: the foundation. Before it, you
confirm the agent understood you and agree the scope and stack. After it,
the build is a one-shot bang, de-risked by **staged rollback checkpoints**
and a **stop-and-narrow rule** that only re-summons you if the plan proves
wrong. It does not improvise past the first milestone.

When **not** to use it:

- The project already has code or populated project memory — use
  `feature.md` / `auto-jazz.md` / `next-batch.md` instead. This mode assumes
  greenfield.
- You only want project setup, no code yet — use `init-project.md` and stop
  after its readiness check.
- You want to approve every implementation step, not just the foundation —
  use `init-project.md`, then `feature.md` per backlog item.

Conservative defaults for the gateless build phase (Phase B), where no
further user input is solicited:

- Prefer the smallest stack and the smallest milestone that proves the
  product idea. An MVP, not v1.
- Prefer the recommended option at every internal decision (per
  `design-options.md`).
- Prefer boring, well-understood, low-dependency technology over novelty.
- Prefer reversible steps and frequent verification; flag anything
  irreversible explicitly.
- If a check trips a real risk, narrow scope rather than push through.

Hard prohibitions (stop and ask one concise question before doing any of
these, even in this mode):

- **Building beyond the first milestone in one run.** Later milestones are
  out of scope — finish the MVP, then hand back to `next-batch.md` /
  `feature.md`. Do not improvise a v2.
- **Adding a runtime dependency the recorded architecture does not name.**
  See the greenfield exception below.
- Destructive operations against anything that pre-exists the run
  (existing files, git history, external state, schemas, data).
- Disabling, weakening, or deleting a test once one exists.
- Touching a file the project later marks under `AGENTS.md` → "Files to
  never edit" or `DEV-INFRASTRUCTURE.md` → "Files agents must not
  hand-edit".

Greenfield exception to the dependency rule: a greenfield build must choose
a stack. Phase A step 4 **fixes and records** the tech stack and dependency
policy in `architecture.md` and `DEV-INFRASTRUCTURE.md`. Every runtime
dependency that record names is authorised by the act of writing it.
Introducing any runtime dependency the record does **not** name still trips
the stop-and-ask rule. Keep the recorded set minimal.

This mode adds no new design stages. It runs the standard pm-skills
four-stage approach at two altitudes:

- **Once, at project altitude, gated (Phase A):** scoping = the product
  read and MVP cut; design options = the stack and architecture;
  implementation plan = the dependency-ordered backlog and skeleton-first
  sequencing; validation = the readiness check. You sign this off.
- **Per backlog item, at item altitude, gateless (Phase B):** the four
  stages collapse to the `auto-jazz` lightweight loop, because the
  project-altitude design already settled options and plan. Each item is
  confirm → implement → verify.

Everything else here — foundation setup, skeleton-first ordering, rollback
checkpoints, stop-and-narrow, whole-MVP integration verification — is
execution scaffolding around that spine, not extra design stages.

--- PHASE A: FOUNDATION (gated — review and sign off before any code) ---

Run this phase like `init-project.md`: present each artifact for review and
wait. The readback (step 3) and the sign-off (step 5) are real gates — do
not write product code until step 5 is approved.

1. State the goal.
   One sentence: the product to build, noting this is a guided foundation
   followed by an autonomous MVP build.

2. Read framework context.
   Read `AGENTS.md`, `UI-STANDARDS.md`, and `DEV-INFRASTRUCTURE.md` (the
   root templates) and `pm_skills/init.md`. These carry the rigour and
   opinions this run must honour. There is no project memory to read yet —
   this run creates it.

3. Capture the wants and read the interpretation back. (gate)
   Gather the wants from, in order of preference: the user's message; an
   already-filled `pm_skills/project/brief.md`; otherwise ask for them.
   Loose input is fine here — turning it into something precise is the job
   of this step. Before building anything, **restate it back**:
   - A one-paragraph product definition — what it is and who it's for.
   - The proposed MVP scope — the candidate first milestone as a short
     bullet list.
   - The assumptions and exclusions you are reading into the loose input.
   Do not invent a product. Present this read and **wait for the user to
   confirm or correct it.** Only once confirmed, write it to
   `pm_skills/project/brief.md` and continue.

4. Build out the foundation. (gated, per `init-project.md`)
   Follow `pm_skills/integrations/init-project.md` steps 2–9, presenting
   each artifact for review as that workflow prescribes. Produce, in order:
   - `architecture.md` — **this is where the stack and dependency policy
     are fixed and recorded.** Keep the runtime dependency set minimal and
     explicit.
   - `backlog.md` — the **first milestone is the MVP scope.** Order it by
     dependency so it can be built top-to-bottom.
   - `conventions.md` (only if the specs imply real conventions; else skip),
     `README.md`, `AGENTS.md`, `UI-STANDARDS.md` (if there is UI),
     `DEV-INFRASTRUCTURE.md` (if there is a build step), and the scaffold
     files.

5. Readiness check, foundation sign-off + Checkpoint 1. (gate)
   Run `init-project.md` step 10 (readiness check + placeholder lint) and
   resolve anything it flags. Then summarise the stack, the MVP scope
   (first milestone, quoted), and the assumptions made, and **get explicit
   sign-off.** Recommend the user commit now so this is a clean rollback
   point; do not auto-commit. This is the **last gate** — once signed off,
   Phase B runs to completion without pausing, except for the hard
   prohibitions and the stop-and-narrow rule.

--- PHASE B: BUILD (gateless — runs to completion after sign-off) ---

No approval gates from here: the foundation sign-off authorised the whole
build. Keep project memory live as you go.

6. Lock the MVP scope.
   Quote the first milestone of `backlog.md` verbatim. That set, and only
   that set, is in scope for this run. Everything below it is out of scope.

7. Stand up a runnable skeleton + Checkpoint 2.
   Before any feature work, create the smallest thing that **runs**: build
   tooling, dev server, entry point, and a trivial "it loads" view or
   output, consistent with the recorded architecture. Verify it actually
   runs (build/serve/test as defined in `DEV-INFRASTRUCTURE.md`). State
   **Checkpoint 2: runnable skeleton** and recommend a commit. If the
   skeleton will not run, stop and fix it before going further — never
   build features on a base that does not run.

8. Burn down the milestone.
   Work the locked milestone items in dependency order. For each item, run
   the `auto-jazz.md` internal loop in lightweight form (the shared
   `architecture.md` and `backlog.md` already supply scope, options, and
   plan, so do not re-derive them — confirm, then build):
   - Implement the item following the minimal-change discipline in
     `AGENTS.md`; imports at the top; match the conventions just recorded;
     stay within the recorded dependency set.
   - Verify: run build/tests; confirm the whole thing still runs.
   - Update project memory as you go: update the item's status in
     `backlog.md`, add new files to `file-map.md`, and note any genuinely
     notable decision for the consolidated decision-log entry in step 10.

9. Stop-and-narrow rule.
   If an item reveals the architecture is wrong, the build stops running,
   the recorded dependency set is insufficient, or the milestone is
   ballooning past an MVP — **stop.** Fix the base, or descope the
   milestone (move the offending items to a later milestone in
   `backlog.md`), and report it. Do not burn the rest of the backlog on a
   broken or runaway base.

--- VERIFY + CLOSE ---

10. Integration verification.
    - The whole MVP builds and runs via the canonical dev/build commands.
    - Every locked milestone item is implemented and ticked, or explicitly
      descoped with a one-line reason.
    - Re-run the placeholder lint from `init-project.md` step 10.
    - Accessibility and UI sanity per `UI-STANDARDS.md` if there is UI.
    - Report what was run, what passed, and any open issues.

11. End-of-task housekeeping.
    Run `pm_skills/prompts/end-of-task.md` once for the whole run. Record a
    single consolidated decision-log entry covering the stack choice, the
    MVP scope, and every assumption made in Phases A and B. Record the
    shipped milestone as a phase in `trajectory.md`; confirm `backlog.md`
    holds only open or descoped work (shipped items moved out). Run the
    memory size check. Present a closing report that names the rollback
    checkpoints (foundation, skeleton) and recommends the next step
    (`next-batch.md` for the second milestone).
