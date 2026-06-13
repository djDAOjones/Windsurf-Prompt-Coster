# Limitations & Accuracy Caveats

This tool is an **after-the-fact, local estimator**. Read this before trusting any
number it shows. Every figure is labelled "estimate" for the reasons below.

## Why the cost is an estimate, not exact

- **No official token counts.** Neither the hooks payload nor the Cascade
  Analytics API exposes exact per-turn token counts. Analytics returns *credits
  in cents, aggregated per day* — not tokens, not per turn
  (see `docs/feasibility-matrix.md` Q6–Q8).
- **Hidden input context.** The real model input includes the system prompt,
  rules, retrieved files, conversation history, and tool output — none of which
  the hook exposes. Estimating input tokens from the visible prompt/transcript
  **undercounts** true billed input, often substantially.
- **Heuristic tokenization.** The default estimator approximates tokens from
  character counts; actual tokens vary by language, code, and tokenizer. Treat
  counts as ±, not precise.

## Pricing caveats

- **Basis is provider list price.** The "$" uses provider API list prices
  (USD/1M tokens) from a versioned config. For **self-serve** (Pro/Max) users who
  pay a flat subscription, this is an *API-equivalent proxy*, not what you are
  billed. For **BYOK** users it closely tracks real provider cost.
- **In-house models.** SWE-* models have no public USD/token rate → shown as
  "cost unavailable" (tokens still estimated).
- **Prices drift.** Rates change; the config is versioned with an `effectiveDate`
  and `pricingBasis`, but may lag provider changes until updated.

## Operational caveats

- **Timing.** The post-response hooks are asynchronous, so the notification
  appears shortly *after* the turn completes.
- **Transcript schema drift.** The live schema (confirmed 2026-05-31) is an action
  stream (`user_input.user_response`, `planner_response.response`, tool actions); the
  docs warn it "may change", so the parser reads this shape but keeps a generic
  fallback and degrades to "cost unavailable" rather than crash.
- **Transcript retention.** `~/.windsurf/transcripts/` is capped at 100 files
  (oldest pruned). The hook reads promptly, but extreme backlogs could prune a
  transcript before it is read.
- **Hook coverage.** Estimates exist only for turns where the hook fires;
  cancelled/errored turns may not produce a record.
- **Model label dependence.** Pricing maps on `model_name`; if Windsurf renames a
  model label, the config needs a matching alias or it shows "cost unavailable".
  Run `cascade-cost-meter models` to see which labels you use and which need a
  price (see `docs/pricing.md`).

## Scope caveats (MVP)

- **macOS notifications only** in the MVP; Linux/Windows adapters come later.
- **No in-IDE UI** (status bar/sidebar) in the MVP.
- **No reconciliation** against Windsurf's own credit usage in the MVP.

## What it is good for

A fast, private, directional sense of per-turn and cumulative spend — to notice
expensive turns and trends — **not** for billing, chargeback, or exact accounting.
