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
      `post_cascade_response_with_transcript` → `bin/cascade-cost-meter.js`.

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

## 3. Live Cascade turn (macOS)

- [ ] Send a normal Cascade prompt; within ~5s an OS notification appears.
- [ ] It shows: model name, input/output token estimate, estimated cost, and the
      word "estimate".
- [ ] A new matching JSONL line is appended.

## 4. Graceful degradation

- [ ] **Unknown model:** force an unknown `model_name` → notification shows tokens
      + "cost unavailable"; turn unaffected.
- [ ] **Missing transcript:** point `transcript_path` at a nonexistent file →
      falls back to the response summary or logs locally; exits 0.
- [ ] **Malformed transcript:** feed a corrupt JSONL line → no crash;
      "cost unavailable" or best-effort; exits 0.
- [ ] **No notifier:** simulate missing `osascript` → no-op + local log; exits 0.

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
