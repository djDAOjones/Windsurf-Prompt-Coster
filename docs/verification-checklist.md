# Manual Verification Checklist

Run this after the Milestone 1 prototype is built, to confirm the end-to-end loop
works and the invariants hold. Boxes are unchecked until verified on a real
machine.

## 0. Prerequisites

- [ ] Node.js LTS installed (`node -v`).
- [ ] `npm install` completed (dev deps only).
- [ ] Pricing seeded at `~/.cascade-cost-meter/pricing/pricing.v1.json` (or repo
      default resolved).
- [ ] Hook wired in `~/.codeium/windsurf/hooks.json` for
      `post_cascade_response_with_transcript` → `bin/hook.js` (run `npm run setup`).

## 1. Unit tests

- [ ] `npm test` passes.
- [ ] Coverage includes parser (valid/malformed/drifted/empty), estimator,
      pricing (known/unknown/alias), cost, and the fail-safe path.

## 2. Offline pipeline (fixtures, no Cascade)

- [ ] `cat test/fixtures/with-transcript.json | node bin/cascade-cost-meter.js`
      prints/notifies an estimate and exits 0.
- [ ] A JSONL line is appended to `~/.cascade-cost-meter/usage.jsonl`.
- [ ] The line contains model, IDs, timestamp, token estimates, cost,
      `pricingVersion` — and **no raw prompt/response text**.

## 3. Diagnose the pipeline with `doctor` (read-only)

- [ ] `npm run doctor` runs without writing anything and prints a single VERDICT.
- [ ] The foundational checks read `[PASS]`: Node runtime, Hook config (wired →
      `bin/hook.js`, this repo), Data dir, Inbox bridge, Parser health, Pricing.
- [ ] `Extension build` reads `matches local build` (rebuild + reinstall the
      `.vsix` if it says the installed bundle differs).
- [ ] If the verdict is `coverage`, recent AI activity used a non-Cascade surface
      (e.g. the Codex/Editor-agent pane, which does not emit the hook). Switch to
      the Cascade panel before expecting any cost.

## 3b. Live Cascade turn (canary)

- [ ] `npm run doctor -- --watch`, then send ONE short prompt in the Cascade
      panel (NOT the Codex pane).
- [ ] Within ~60s the WATCH VERDICT reads `healthy`: a new `usage.jsonl` line is
      appended with parsed, nonzero tokens and an estimated cost.
- [ ] The in-IDE status-bar total updates and a per-turn toast appears (extension
      installed). A `coverage`/`hook firing`/`extension bridge` verdict instead
      pinpoints exactly which link is broken.

## 4. Graceful degradation

- [ ] **Unknown model:** force an unknown `model_name` → notification shows tokens
      + "cost unavailable"; turn unaffected.
- [ ] **Missing transcript:** point `transcript_path` at a nonexistent file →
      falls back to the response summary or logs locally; exits 0.
- [ ] **Malformed transcript:** feed a corrupt JSONL line → no crash;
      "cost unavailable" or best-effort; exits 0.
- [ ] **Doctor is read-only:** `npm run doctor` leaves `usage.jsonl` and
      `inbox.jsonl` byte-for-byte unchanged.

## 5. Never disrupt Cascade (critical invariant)

- [ ] With each failure above injected, the Cascade turn still completes normally.
- [ ] The hook process exits 0 in every case (`echo $?` after a manual run).
- [ ] Errors are recorded in the local internal log, not surfaced to Cascade.

## 6. Privacy checks

- [ ] `grep` the usage log for a known phrase from your prompt → **no match**
      (raw text not stored) when opt-in is off.
- [ ] No outbound network connection is made during a run (e.g. observe with a
      network monitor, or confirm no networking code path is reached).
- [ ] Log lives under `~/.cascade-cost-meter/` (not in the repo, not in a
      cloud-synced folder); files are owner-only (`ls -l`).

## 7. Pricing config

- [ ] Editing a rate in `pricing.v1.json` changes the next estimate (config-driven,
      not hard-coded).
- [ ] The notification/log records the `pricingVersion` used.

## Sign-off

- [ ] All critical-path (sections 2, 3, 5, 6) boxes checked → MVP accepted.
