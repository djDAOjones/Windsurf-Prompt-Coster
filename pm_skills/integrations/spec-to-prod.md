---
description: Take a spec from zero to a deployed product, in signed-off scope bands
---

The end-to-end orchestrator. It chains pieces that already exist —
`init-mvp.md` (gated foundation + first-milestone build), the
`next-batch.md` + `auto-jazz.md` milestone loop, and `deploy.md`
(production deploy + live verification) — into one run that goes from a
loose spec to software running in production.

It adds almost no new behaviour. Its only additions are the **sequencing**,
**one extra gate** (how far this run goes), and the **deploy hookup**.
Everything else is delegated to the workflows above, which keep their own
rigour: design-before-code, Carbon, WCAG 2.2 AAA, minimal dependencies,
staged rollback checkpoints, stop-and-narrow, live project memory.

Use this when you have a spec (loose is fine) and want one workflow to
carry it to a deployed result, steering only at the two points that
carry real leverage: the foundation, and how far to go.

## Relationship to `init-mvp.md`

`init-mvp.md` deliberately stops at the first milestone and never
deploys — it proves the product idea, then hands back. This workflow
*wraps* it: it runs `init-mvp.md` for the foundation and MVP, then —
only within a scope band you sign off — carries further milestones and
finishes with a production deploy. It does not replace `init-mvp.md`'s
"MVP, not v1" discipline; it extends past it on an explicit mandate.

## The scope band (the one extra gate)

This run goes exactly as far as the band you sign off — no further.
Pick one in Phase A and quote it back:

- **Band 1 — Deployed MVP.** The first milestone only (as `init-mvp.md`
  scopes it), then deploy. The default and the recommendation: it
  proves the idea *in production* with the least exposure.
- **Band 2 — Deployed Current milestone.** Everything under the
  backlog's **Current milestone**, then deploy. Choose when the MVP
  alone is not yet shippable to real users.
- **Band 3 — Full backlog to production.** Every committed milestone
  (Current + Next), then deploy. The most autonomy and the most risk;
  requires explicit sign-off and a backlog you trust is correctly
  ordered. Never the silent default.

The band is a hard ceiling for the run. Reaching it ends the build
phase — the workflow does not improvise past it. To go further later,
run `next-batch.md` for the next milestone.

## Version control (expectation, not requirement)

**Expect this project to live in a Git repository with a remote
(GitHub or equivalent).** It is not strictly required, but it is the
assumed default, because this workflow's safety rails depend on it:
the staged rollback checkpoints are *commits*, and `deploy.md` ships a
clean, committed tree mapped to a known revision. Without version
control, "roll back to the last checkpoint" and "deploy a known
commit" both degrade to manual file copies.

So, in Phase A:

- If the project is already a Git repo with a remote, say so and
  continue.
- If it is a Git repo with no remote, **recommend** adding one (e.g. a
  GitHub repo) before Phase B, so checkpoints and the deploy are
  recoverable off-machine.
- If it is not a Git repo at all, **recommend** initialising one and
  creating a remote before any code is written. Proceed without only
  if the user explicitly declines — and then warn, once, that rollback
  checkpoints degrade to local backups and that `deploy.md`'s
  clean-tree guarantee cannot hold.

Recommend, do not perform: never create or push to a remote, or run
`git init`, without the user's go-ahead.

## Hard prohibitions

Inherit every prohibition from `init-mvp.md` and `auto-jazz.md` (no
unrecorded runtime dependencies, no protected/never-edit files, no
destructive migrations against pre-existing state, never weaken a
test). Plus, specific to this orchestrator:

- **Do not exceed the signed-off scope band.** Finish it and hand
  back; do not roll on into the next milestone unprompted.
- **Do not deploy off an undocumented pipeline.** `deploy.md` step 1
  governs: if `DEV-INFRASTRUCTURE.md` → Deployment is unpopulated,
  populate it (with sign-off) before shipping.
- **Do not deploy without both gates passed** — foundation sign-off
  and scope-band sign-off.

--- PHASE A: FOUNDATION + MANDATE (gated) ---

1. State the goal.
   One sentence: the product to build and ship, noting this is a guided
   foundation followed by an autonomous build-and-deploy within a
   signed-off scope band.

2. Run `init-mvp.md` Phase A.
   Follow `pm_skills/integrations/init-mvp.md` Phase A in full: capture
   the wants and read the interpretation back (gate), build out the
   foundation (`architecture.md`, `backlog.md`, root templates,
   scaffold), then the readiness check and **foundation sign-off**
   (its Checkpoint 1). Do not write product code until that sign-off.

3. Confirm version control.
   Apply the "Version control" section above: check the repo/remote
   state and make the recommendation. Get the user's go-ahead on any
   `git init` or remote creation.

4. Sign off the scope band. (gate)
   Present the three bands, recommend Band 1, and **wait** for the user
   to pick. Quote the chosen band — and the exact backlog milestones it
   covers — verbatim. This is the last gate before the autonomous run.

--- PHASE B: BUILD (gateless within the band) ---

No approval gates from here until the band is built. Keep project
memory live throughout.

5. Build the MVP.
   Run `init-mvp.md` Phase B (lock the MVP scope, stand up a runnable
   skeleton + Checkpoint 2, burn down the first milestone, stop-and-
   narrow rule). This completes Band 1.

6. Extend to the band ceiling. (only if Band 2 or 3)
   If the signed-off band is larger than the MVP, continue milestone by
   milestone up to the ceiling, in dependency order:
   - Pick the next batch as `next-batch.md` describes (but do not stop
     for go-ahead — the band sign-off already authorised it).
   - Build it with the `auto-jazz.md` loop.
   - Recommend a commit after each completed milestone — these are the
     rollback checkpoints. State each one.
   - Apply `init-mvp.md`'s stop-and-narrow rule: if the architecture
     proves wrong, the build stops running, or scope balloons, **stop**,
     fix the base or descope, and report. Do not burn the band on a
     broken base.

--- PHASE C: SHIP ---

7. Deploy to production.
   Run `pm_skills/prompts/deploy.md` end to end: confirm the pipeline is
   defined, pre-flight (clean tree, green build, version stamped,
   secrets external), run the documented pipeline, verify the live
   result, and roll back on failure. If Deployment is undocumented,
   populate `DEV-INFRASTRUCTURE.md` → Deployment with sign-off, then
   deploy.

--- VERIFY + CLOSE ---

8. Integration verification.
   - Every milestone in the signed-off band is implemented and ticked,
     or explicitly descoped with a one-line reason.
   - The whole thing builds and runs via the canonical commands.
   - The live deployment is verified (version match, critical-path
     smoke test, healthy logs).
   - Accessibility and UI sanity per `UI-STANDARDS.md` if there is UI.

9. End-of-task housekeeping.
   Run `pm_skills/prompts/end-of-task.md` once for the whole run.
   Record a single consolidated `decision-log.md` entry covering the
   stack, the MVP cut, the chosen scope band, the deploy, and every
   assumption made. Record the shipped milestones as phases in
   `trajectory.md`; confirm `backlog.md` holds only open or descoped
   work. Run the memory size check. Present a closing report naming the
   rollback checkpoints (foundation, skeleton, per-milestone commits),
   the live deploy result, and the next step (`next-batch.md` for the
   first milestone beyond the band).
