# Deploy

Run this to ship a **consuming project** to production and verify the
live result. It is the deploy primitive the build workflows hand off
to once work is merged and green.

This is **not** `prompts/release.md`. That versions the pm-skills
framework itself inside this source repo. This deploys *your app* using
the pipeline recorded in `DEV-INFRASTRUCTURE.md` → Deployment.

The framework does not invent a deploy pipeline. It executes the one
your project already documented. If that section is unpopulated, the
honest first move is to populate it — you cannot reproducibly deploy
off an undefined pipeline.

## 1. Confirm the deploy is defined

Read `DEV-INFRASTRUCTURE.md` → Deployment (target, pipeline, post-deploy
verification), Version management, and Canonical scripts.

- If Deployment is still a `<!-- CUSTOMISE -->` placeholder, **stop.**
  Populate it first (see `pm_skills/init.md` Step 8) — name the target,
  the exact pipeline commands, and how to verify the live result. Then
  resume here.
- If it is populated, quote the pipeline commands and the
  post-deploy verification back in one block so the run is auditable.

## 2. Pre-flight checks

Do not deploy until all of these hold. Report any that fail and stop.

- **Clean, committed tree.** No uncommitted changes; on the canonical
  branch named in `DEV-INFRASTRUCTURE.md` (or the project's default).
  A deploy off a dirty tree is unreproducible and cannot be cleanly
  rolled back.
- **Green build and tests.** Run the canonical build and test scripts.
  A red build never ships.
- **Version stamped.** Bump the version per the project's documented
  versioning scheme so the live deploy maps to a known revision.
- **Secrets are external.** Confirm no key, token, or credential is
  hard-coded or about to be committed. Deploy-time secrets come from
  the environment or the platform's secret store, never the repo.

## 3. Run the documented pipeline

Execute the deploy commands exactly as `DEV-INFRASTRUCTURE.md` records
them. Do not improvise alternative commands, flags, or targets.

- If a command is destructive or irreversible (e.g. a prod migration,
  a data backfill), flag it explicitly before running and confirm the
  rollback path in step 5 exists first.
- Capture the output. Note the deployed commit or tag.

## 4. Verify the live deployment

A deploy is not done until the live result is confirmed. Run the
post-deploy verification `DEV-INFRASTRUCTURE.md` defines, plus:

- **Version match** — the live URL serves the version just built.
- **Critical-path smoke test** — exercise the one or two flows that
  would break trust if they failed.
- **Health and logs** — check the platform's health signal and scan
  deploy/runtime logs for new errors.

State plainly what was checked and what passed.

## 5. On failure, roll back

Know the rollback path *before* you deploy. If verification fails:

- Roll back to the last known-good release using the documented
  rollback (re-deploy the previous tag, revert, or the platform's
  one-click rollback).
- Confirm the live result is healthy again.
- Report what failed, what the live state is now, and the suspected
  cause. Do not leave a half-shipped deploy live.

## 6. Record the deploy

Run `pm_skills/prompts/end-of-task.md` housekeeping. Specifically:

- `pm_skills/project/trajectory.md` — one line: what shipped to
  production and the version/date.
- `pm_skills/project/decision-log.md` — only if the deploy involved a
  non-obvious choice (a pipeline change, a rollback, an infra decision).
- `DEV-INFRASTRUCTURE.md` — update Deployment or Version management if
  the pipeline itself changed this run.

## Rules

- **Never deploy off an undocumented pipeline.** Define it in
  `DEV-INFRASTRUCTURE.md` first.
- **Never deploy a dirty or red tree.** Clean, committed, green.
- **Never skip post-deploy verification.** A build that compiles is
  not a deploy that works.
- **Never hard-code secrets** to make a deploy pass. Use the
  environment or the platform secret store.
- Prefer reversible, verifiable deploys with a known rollback over a
  fast one with none.
