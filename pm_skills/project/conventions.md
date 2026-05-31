# Conventions

<!-- Fill this in before or during your first implementation task. -->
<!-- Skip at init if you're not sure yet — capture conventions as they emerge. -->
<!-- Hot whole-file read. See AGENTS.md → "Memory size budgets" for limits. -->

<!-- Provisional; confirmed at the start of Milestone 1 implementation. -->

## Code style

- **Modern JavaScript, ESM** (`import`/`export`, `"type": "module"`). No
  TypeScript for the MVP (keeps the zero-dependency, no-build target); use JSDoc
  type annotations where they aid clarity.
- Indentation, line endings, and charset follow `.editorconfig`.
- Single quotes, semicolons, `const`/`let` (never `var`), early returns over deep
  nesting.
- Core logic is **pure and synchronous where possible**; side effects (fs,
  spawning the notifier) live only in the adapter/log modules.

## Naming

- Files: lowercase, `camelCase` only when the name is multi-word and mirrors its
  main export (e.g. `usageLog.js`). Directories: lowercase, single word.
- Functions/variables: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Pricing config files: `pricing.v<major>.json`.

## Commit messages

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`,
  `chore:`. Imperative mood, concise scope where useful (e.g. `feat(parser):`).

## Documentation

- JSDoc on every exported function and module: purpose, params, returns, and side
  effects. Explain **why**, not what (per `AGENTS.md`).
- Each module's transcript/pricing assumptions documented at the top, since both
  are external and may drift.

## Testing

- **Vitest.** Tests live in `test/` mirroring `src/`.
- Must cover: transcript parsing (valid, malformed, drifted, empty), token
  estimation, pricing lookup (known/unknown/disabled), cost calculation, and the
  **fail-safe path** (bad input never throws / always exits 0).
- Use sanitized fixtures only — never real transcripts in the repo.
- Run `npm test` after every change; never weaken or delete tests.

## Patterns to follow

- **Fail-safe wrapper** around the whole pipeline: catch everything, log locally,
  exit 0 — the hook must never disrupt Cascade.
- **Config-driven pricing**: all rates come from the versioned config, never code.
- **Counts-not-content**: log token counts and metadata, not raw text, by default.
- **Capability detection** before using an OS notifier; degrade to a no-op.

## Patterns to avoid

- Hard-coding model prices or model lists in logic.
- Storing or transmitting raw prompt/response text by default.
- Any network call in the default path.
- Throwing (or non-zero exit) out of the hook entry point.
- Presenting an estimate as if it were exact (always label "estimate").

## Tooling

- **Runtime:** Node.js LTS, ESM, no bundler (run source directly).
- **Test runner:** Vitest (dev dependency).
- **Formatting:** `.editorconfig` (mechanical); `.markdownlint.json` for docs.
- **Linter:** none yet. For detailed build/dev/versioning rules, see
  `DEV-INFRASTRUCTURE.md`.
