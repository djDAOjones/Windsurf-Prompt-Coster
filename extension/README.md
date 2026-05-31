# Cascade Cost Meter

Local, privacy-first **estimated** per-turn cost for Windsurf Cascade, shown
in-IDE.

After each Cascade turn (via a documented post-response hook), this extension
reads the on-disk transcript, estimates input/output tokens, prices them from a
versioned local config, and surfaces the estimate:

- **Status bar** — a running today/session total (`≈ $…`).
- **Per-turn toast** — `Cascade estimate: $0.018 · 2.4k in / 680 out · Claude Sonnet 4`.
- **Commands** — *Open Usage Log* and *Show Today's Breakdown*.

## Estimates only

No official Windsurf surface exposes exact per-turn token counts, so every figure
is an **estimate** and is labelled as such. This is a meter, not a billing system.

## Privacy

100% local. No network calls. The usage log stores token counts and metadata —
**not** raw prompt/response text (raw text is opt-in only). Data lives in
`~/.cascade-cost-meter/`, outside any repo.

## Setup

This extension is the UI half of the Cascade Cost Meter project. See the
project's `docs/setup.md` for installing the `.vsix`, wiring the Cascade hook,
and configuring pricing.

## Settings

- `cascadeCostMeter.showToastPerTurn` — show the per-turn notification (default on).
- `cascadeCostMeter.statusBarScope` — `today` or `session` total (default `today`).
