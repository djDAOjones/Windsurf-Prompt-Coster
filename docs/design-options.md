# Design Options & Recommendation

Stage 2 of the planning sequence. Options are grounded in `docs/feasibility-matrix.md`.

## A. Primary architecture

### Option A1 — Hook → Node CLI → OS notification + JSONL *(recommended MVP)*

The post-response hook runs a Node CLI that estimates cost, fires an OS-native
notification, and appends a JSONL record.

- **Pros:** no extension to package/install; uses only documented hooks;
  cross-platform via one adapter; smallest moving parts; fail-safe is trivial
  (exit 0).
- **Cons:** notification lives in the OS, not the IDE; no running session total
  until Milestone 2 reads the log.
- **Feasibility:** Confirmed (Q1, Q10, Q13).

### Option A2 — Hook → CLI → file → Open VSX extension (status bar + in-IDE toast)

Same CLI, but it writes a state file the extension watches (`fs.watch`) to render
a status bar total and in-IDE notifications.

- **Pros:** native in-IDE UX; persistent session/day total in the status bar.
- **Cons:** must build, package, and sideload an extension (MS Marketplace
  unavailable → Open VSX/`.vsix`); more surface area; bridge adds moving parts.
- **Feasibility:** Confirmed but heavier (Q11, Q12; proven by `windsurf-cli`).
- **Verdict:** **Icebox** — the right v2 once the estimator is trusted. The CLI's
  JSONL/state file is designed so this needs no rework.

### Option A3 — Analytics API reconciliation (Teams/Enterprise)

Periodically pull `cascade_runs` to show *actual* credit consumption.

- **Pros:** real Windsurf-side numbers (credits).
- **Cons:** Teams/Enterprise only (`service_key`); **daily** aggregation by
  `cascadeId`, not per turn; credits-in-cents, not tokens/$; pipeline latency.
- **Feasibility:** Partial, not an MVP fit (Q7, Q8).
- **Verdict:** **Icebox**, opt-in, as a *reconciliation* layer — never the live
  per-turn figure.

### Option A4 — Scrape app internals / private state *(rejected)*

- **Cons:** violates "official documented APIs only"; brittle; privacy risk.
- **Verdict:** **Rejected** for the default product (only ever a clearly
  separated experimental opt-in).

## B. Which post-response hook

| Choice | Pros | Cons |
| --- | --- | --- |
| `…_with_transcript` *(recommended)* | Full conversation, machine-readable JSONL; best for token estimation | Must parse a file whose schema may drift; read promptly (100-file cap) |
| `post_cascade_response` | Simple inline markdown; no file IO | Summary only ("steps since last user input"); weaker token basis |

**Recommendation:** use `…_with_transcript` as the primary input, and fall back
to the `post_cascade_response` summary if the transcript is missing/unreadable —
register both for resilience.

## C. Token estimation method

| Choice | Pros | Cons |
| --- | --- | --- |
| Heuristic (≈ chars/4, model-aware factor) *(recommended MVP)* | Zero dependencies; instant; good enough for a meter | Approximate (±; varies by language/code) |
| Exact tokenizer (e.g. `gpt-tokenizer`, tiktoken) | Closer per-model counts on the *visible* text | Runtime dependency (needs approval); still can't see hidden context |

**Recommendation:** heuristic for MVP behind a pluggable interface; exact
tokenizer is an opt-in upgrade. Either way, true input context is unobservable
(Q5), so the figure stays an estimate.

## D. Pricing basis (what the "$" means)

| Choice | Pros | Cons |
| --- | --- | --- |
| Provider API list price (USD/1M tokens) *(recommended)* | Familiar $ figure; correct for BYOK; clean per-model config | Self-serve users don't pay per token — it's an "API-equivalent" proxy |
| Windsurf credits / ACUs | Matches Windsurf billing | Not exposed per turn; meaningless for BYOK; multipliers not in $ |

**Recommendation:** USD/1M-token provider list price in a versioned config with a
`pricingBasis` label (e.g. `provider_api_list_price`) and `effectiveDate`. SWE-*
in-house models have no public rate → "cost unavailable". Optionally surface
credits later as a secondary number.

## E. Runtime

**Node.js (ESM), zero runtime deps** — cross-platform, shares code with a future
extension, trivial install. Python rejected (second runtime, no extension reuse).

## Recommended MVP

**A1 + `…_with_transcript` (fallback to summary) + heuristic tokens + provider
list-price config + Node, zero deps.** This is the smallest design that delivers
a trustworthy, clearly-labelled per-turn estimate without disrupting Cascade,
and it leaves a clean upgrade path to the extension UI (A2) and optional
reconciliation (A3).

## Decided at sign-off (2026-05-31)

The maintainer expanded the MVP to **include the Open VSX extension** as the
primary surface: **status-bar total + per-turn in-IDE toast + usage-log command**.
The **OS notification is dropped from the MVP** (deferred to Milestone 2). Token
estimation uses the **heuristic** by default with an optional **`js-tiktoken`**
exact path for OpenAI models. Seed pricing ships sensible, editable defaults. See
`pm_skills/project/decision-log.md` and the updated `architecture.md`.

## Original open decisions (now resolved)

1. **Notification channel on macOS:** built-in `osascript` (no install) vs
   `terminal-notifier` (nicer, needs `brew install`). Proposed: `osascript`,
   detect-and-fallback.
2. **Token method for v1:** heuristic now vs add the exact tokenizer immediately
   (one approved dependency). Proposed: heuristic now.
3. **Seed models in `pricing.v1.json`:** which models to include first
   (Claude Sonnet/Opus, GPT-4.1/4o, Gemini; SWE-* = unavailable). Proposed: the
   common paid models you actually use.
