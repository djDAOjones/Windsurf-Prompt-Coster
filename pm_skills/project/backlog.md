# Backlog

<!-- Open work only. Shipped work lives in trajectory.md + decision-log.md. -->
<!-- Status: [ ] todo  [~] in progress  [-] cut -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See AGENTS.md → "Memory size budgets" for thresholds; roadmap-refactor.md to repair drift. -->

## Active

### Current

- [~] **Verify on-machine & ship** (Milestone 1.5 Phase 4)
  Intent: prove the meter records exactly one correct usage record per real Cascade turn, end to end.
  Done when: after a full Windsurf restart, `doctor --watch` + one Cascade prompt yields a `healthy` verdict; then reinstall the `.vsix`, drive a real turn, and confirm one usage record with the correct `$` against `docs/verification-checklist.md`.
  Notes: core already verified on-machine (real log dedupes; backup kept) and `.vsix` re-packaged; live hook rewired to `/opt/homebrew/bin/node`. Subsumes the original Milestone 1 on-machine verification item.

### Next

- [ ] OS notification fallback when the extension is inactive (macOS `osascript`,
  then Linux `notify-send`, Windows PowerShell toast).
- [ ] Configurable currency and per-turn threshold.
- [ ] Richer session/daily totals and per-model breakdown.
- [ ] Publish the extension to the Open VSX registry.

### Icebox

<!-- Post-triage; promote from wish-list.md as they mature. -->

- [ ] Sidebar dashboard / webview with charts.
- [ ] Analytics API reconciliation for Teams/Enterprise users (daily, per model).
- [ ] Exact tokenizer coverage for non-OpenAI models (blocked: no public tokenizer).
