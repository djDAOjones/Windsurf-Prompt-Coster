# Pricing & model coverage

Every dollar figure in Cascade Cost Meter is an **estimate**. Token counts are
approximated locally and multiplied by **public provider API list prices** (USD
per 1,000,000 tokens). These list prices are a per-turn *proxy* — they are **not**
what Windsurf self-serve or credit/ACU plans actually bill; for BYOK they track
your provider's own pricing.

## Where prices live

Prices live in **versioned config**, never in code:

- Bundled default: `config/pricing/pricing.v1.json` (shipped with the repo).
- Your override (optional): `~/.cascade-cost-meter/pricing/pricing.v1.json`.

If the override exists and is valid it wins; otherwise the bundled default is
used. Each file carries a `version`, a `pricingBasis` label, an `effectiveDate`,
and a `currency`, so any figure can be traced to the rates that produced it.

## Why a turn can read "cost unavailable"

A turn shows `cost unavailable` (tokens are still estimated) when its model label
is not in the config. Two common reasons:

- **In-house models** (`SWE-1.6`, `SWE-1.5`, `swe-grep`, …) have no public
  per-token price, so they are intentionally omitted.
- **A new or renamed label** in your Cascade model selector that the config does
  not list yet.

## Find which labels you actually use

Windsurf's docs say the authoritative list of current models is the in-IDE model
selector — and that exact label is what each turn records. To see the labels in
your own history and which are priced:

```bash
cascade-cost-meter models
```

```text
Models seen in usage history (2):

  [priced]   Claude Opus 4.8 Max  ·  42 turns  ·  last 2026-05-31
  [UNPRICED] SWE-1.6  ·  7 turns  ·  last 2026-05-31

1 model needs a price. Add them to your pricing config:
  ~/.cascade-cost-meter/pricing/pricing.v1.json  (see docs/pricing.md)
```

It is read-only and prints **counts only** — never prompt/response text.

## Add or fix a price

Add an entry (or an alias on an existing one). The matcher is case- and
space-insensitive, so aliases only need to cover spelling/label variants:

```json
{
  "model": "Claude Opus 4.8",
  "aliases": ["Claude Opus 4.8 Max", "Claude Opus 4.8 (Thinking)"],
  "usdPer1MInput": 5,
  "usdPer1MOutput": 25
}
```

- Use the **exact label** from `cascade-cost-meter models` as the `model` name or
  an `alias`.
- Rates are **USD per 1,000,000 tokens**, input and output separately.
- Prefer editing your override file so repo updates do not clobber your changes.

## Keeping prices current

Provider prices drift. The shipped figures are a point-in-time snapshot (see
`effectiveDate`); to refresh, compare against the providers' published API
pricing and edit the values. There is **no automatic price fetching** in the
default path — staying fully local is a core promise. (An opt-in refresh command
and a Windsurf ACU-credit basis are tracked as possible future work.)
