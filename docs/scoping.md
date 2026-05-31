# Scoping — Cascade Cost Meter MVP

Stage 1 of the planning sequence. Defines what the first build includes, what it
excludes, and what "done" means. **No code is written until this scope is signed
off.**

## Problem

Windsurf Cascade gives no per-turn signal of how much an AI response cost.
Self-serve (Pro/Max) and BYOK users especially have no in-IDE dollar figure per
turn. The goal is immediate, lightweight, **estimated** cost feedback after each
turn — a meter, not a billing system.

## Goals

- After each Cascade turn, show a visible **estimated** cost within ~5 seconds.
- Include token estimates and the model name in the message.
- Keep a local, append-only history for later totals.
- Never disrupt Cascade; never send data off the machine by default.

## Non-goals (MVP)

- Exact token counts or exact billed cost (no official source exists).
- A polished sidebar dashboard / charts (the status bar + per-turn toast ARE in
  scope via the extension; a richer panel is not).
- Teams/Enterprise Analytics reconciliation.
- Multi-IDE (JetBrains) support.
- Configurable dashboards or charts.

## In scope (Milestone 1)

- A `post_cascade_response_with_transcript` hook config sample + fail-safe hook
  entry that appends a content-free event to an inbox queue (always exits 0).
- A shared core that parses the transcript, estimates input/output tokens, looks
  up versioned pricing, and computes estimated cost.
- An **Open VSX extension**: status-bar running total, per-turn in-IDE toast, and
  a usage-log / today's-breakdown command; it watches the inbox and backfills.
- A headless CLI running the same core (tests / no-extension use).
- A JSONL usage record under `~/.cascade-cost-meter/` (counts, not content).
- Seed pricing config, settings template, sample hook wiring.
- Unit + integration tests for parser, estimator, pricing, cost, storage, the
  pipeline, and the never-crash path.
- A setup guide and a manual verification checklist.

## Out of scope (later milestones / icebox)

- OS notification fallback, Linux/Windows notifiers, currency/threshold settings
  (Milestone 2).
- Publishing the extension to the Open VSX registry (Milestone 2).
- Exact tokenizer for non-OpenAI models; Analytics reconciliation; sidebar
  dashboard (icebox).

## Success criteria

- Triggering a real Cascade turn produces a notification within ~5s that names
  the model, shows input/output token estimates and an estimated cost (or
  "cost unavailable" for unknown models), labelled "estimate".
- A matching JSONL line is appended; it contains **no raw prompt/response text**
  by default.
- Forcing a parse error / unknown model / missing notifier does **not** break the
  Cascade turn (hook exits 0) and is logged locally.
- `npm test` passes for all core modules.

## Assumptions (to validate on a real machine)

- `…_with_transcript` writes a JSONL transcript whose latest entries expose the
  model, the user prompt, and the assistant response (Feasibility Q5/Q13).
- macOS `osascript` notifications are available in the user's environment.
- The user is on a self-serve plan (cost shown as provider-API-equivalent).

## Key risks

- **Transcript schema drift** (docs warn it may change) → resilient parser +
  fixtures + graceful "cost unavailable" fallback.
- **Estimate inaccuracy** (input context not visible) → clear "estimate" framing;
  document the basis in `docs/limitations.md`.
- **Notification noise** → optional threshold (Milestone 2); start simple.

## Sign-off gate

Implementation of Milestone 1 begins only after the maintainer approves this
scope and the recommended option in `docs/design-options.md`.
