# PM Skills — Guide

An opinionated starter pack for AI-assisted coding projects.
Structured markdown files, design-before-code discipline, and
persistent project memory — the way Joe likes to work in 2026.

For solo and small-team builders who own product direction and
macro structure but want AI agents to handle implementation
without losing context, drifting, or wasting tokens.

Defaults to Carbon Design System, WCAG 2.2 AAA, Nielsen heuristics,
and JSDoc. All customisable, none apologised for.

## Start here

**New project?** Follow [init.md](./init.md) step by step.

**Already using an older version of pm-skills?** Run
[`integrations/upgrade.md`](./integrations/upgrade.md), or paste
[`prompts/upgrade.md`](./prompts/upgrade.md) into your AI tool. The
workflow compares your project's `VERSION` against the latest, applies
only the deltas the `CHANGELOG.md` documents (stopping early if you
are already current), preserves your project memory and populated root
templates, and never silently overwrites a customised framework file.

## Memory layers and read tiers

The framework uses **two memory layers** and **three read tiers**.

**Two memory layers:**

- **`project/`** — living project memory. Updated every session.
  Contains the brief, backlog, wish-list, file map, conventions, and
  decision log.
- **`AGENTS.md` + `UI-STANDARDS.md` + `DEV-INFRASTRUCTURE.md`** (in
  the project root) — permanent behavioral contracts. Contain hard
  rules, invariants, accessibility standards, design system
  conventions, and dev infrastructure rules. Populated during the
  kickoff process (Steps 6–8 of `init.md`) and updated when major
  architectural, UI, or build decisions change.

**Three read tiers** (canonical policy in `AGENTS.md` → "Before
every task"):

- **Hot whole-file** — read every task.
- **Hot sectional** — read by section only (`backlog.md` Active;
  `decision-log.md` latest 10).
- **Cold** — `pm_skills/project/wish-list.md` (capture inbox) and
  `pm_skills/project/archive/*` are never auto-read.

AI tools that support global rules load `AGENTS.md` automatically.
For other tools, the session-start prompts include explicit read
instructions.

## What's in this folder

```text
VERSION          Current framework version (semver). The upgrade check.
CHANGELOG.md     Append-only release log; each entry is an upgrade plan.
MANIFEST.md      Path classes: framework / template / memory / scaffold.

project/         Durable project memory. Fill once, maintain ongoing.
  brief.md         What we're building.
  architecture.md  Tech stack, structure, key decisions.
  conventions.md   Style, naming, patterns, rules.
  backlog.md       Living task list with status.
  wish-list.md     Capture inbox for unscoped ideas (cold; triaged later).
  file-map.md      Key files and their roles.
  decision-log.md  Append-only record of design decisions.

prompts/         Reusable per-task prompts.
  session-start.md        How to begin a new chat.
  next-batch.md           Begin a chat by auto-picking the next backlog item.
  scoping.md              Stage 1: scope the task.
  design-options.md       Stage 2: explore options.
  implementation-plan.md  Stage 3: plan the build.
  validation.md           Stage 4: pre-code checks.
  quick-task.md           Single-stage alternative for small tasks.
  bug-scoping.md          Bug-specific scoping: reproduce, diagnose, fix.
  end-of-task.md          Canonical end-of-task housekeeping.
  corrections.md          Drift correction snippets.
  prune-memory.md         Memory-pruning procedure (canonical).
  upgrade.md              Framework upgrade procedure (canonical).
  release.md              Maintainer release checklist (source repo only).

integrations/    Optional tool-specific workflows.
  init-project.md    Guided project initialization.
  feature.md         Full task workflow with approval gates.
  bugfix.md          Diagnosis-before-fix workflow for bugs.
  auto-jazz.md       Full 4-stage workflow, no approval gates.
  auto-jazz-lite.md  Fast 2-stage workflow, no approval gates.
  upgrade.md         Upgrade an existing project to the latest version.

scaffold/        Template files to copy into your project root.
  .editorconfig    Editor style enforcement (indent, encoding, etc.).
  .gitignore       Common ignores for JS/npm projects.
```

## Per-task quick reference

### AI tools with workflow support

If your AI tool supports workflows, copy the files from
`integrations/` to your tool's workflow directory. Then run the task
workflow at the start of any task — it reads project memory, asks
full vs quick, runs the pipeline, and triggers the canonical
end-of-task housekeeping (`prompts/end-of-task.md`).

Choose the workflow that fits the task:

- **`feature.md`** — full task workflow with approval gates between
  scoping, design, plan, and validation. Use by default.
- **`bugfix.md`** — diagnosis-before-fix workflow with approval gates.
  Use for bugs.
- **`auto-jazz.md`** — same internal stages as `feature.md` but no
  approval gates. The agent picks the recommended option, states
  each assumption in one line, and continues. Hard prohibitions
  still apply (see the file). Use when you trust the agent end-to-end.
- **`auto-jazz-lite.md`** — fast two-stage flow with no approval
  gates. Stage 1 is a combined scope-and-plan; stage 2 covers
  implementation, validation, verification, and housekeeping. Hard
  prohibitions still apply. Use for small or low-risk tasks.

All four workflows search the source tree before changing code and
run the same end-of-task housekeeping: memory updates, size check,
and a closing report.

### Manual prompt workflow

**Starting from the backlog (any task type):**

Instead of naming the task yourself, paste `prompts/next-batch.md`. It
loads context, picks the next logical batch from the backlog, and
presents it with a recommended workflow — then stops for your
go-ahead. Confirm, then continue with the matching workflow below.

**Non-trivial tasks (4-stage):**

1. New chat → paste `prompts/session-start.md` (Standard start).
2. Paste `prompts/scoping.md` → approve scope.
3. Paste `prompts/design-options.md` → pick an option.
4. Paste `prompts/implementation-plan.md` → approve plan.
5. Paste `prompts/validation.md` → confirm readiness.
6. "Go ahead and implement."
7. End of task → paste `prompts/end-of-task.md`.

**Small tasks (single-stage):**

1. New chat → paste `prompts/session-start.md` (Quick start).
2. Paste `prompts/quick-task.md` → approve plan.
3. "Go ahead and implement."
4. End of task → paste `prompts/end-of-task.md`.

**Bug tasks:**

1. New chat → paste `prompts/session-start.md` (Bug start).
2. Paste `prompts/bug-scoping.md` → approve diagnosis and fix plan.
3. "Go ahead and fix."
4. Verify the fix.
5. End of task → paste `prompts/end-of-task.md`.

## Keeping project memory fresh

| File | When to update |
| --- | --- |
| `brief.md` | Rarely. Only if the project's direction fundamentally changes. |
| `architecture.md` | When adding major modules or changing the tech stack. |
| `conventions.md` | When a new convention is established or changed. |
| `backlog.md` | End of every task — mark done, add follow-ups. |
| `wish-list.md` | When an out-of-scope idea surfaces — append one line. Drained by triage at `next-batch.md`. |
| `file-map.md` | When files are created, renamed, or deleted. |
| `decision-log.md` | During the design phase of each task. |
| `README.md` (root) | When architecture, dev workflow, or key infrastructure changes. |
| `AGENTS.md` (root) | When new invariants, data model changes, protected modules, event namespaces, or anti-patterns are established. |
| `UI-STANDARDS.md` (root) | When new token systems or UI conventions are established. |
| `DEV-INFRASTRUCTURE.md` (root) | When build, dev server, versioning, or script conventions change. |

Use `prompts/end-of-task.md` at the end of every task session to
stay current.

## Keeping memory lean

Project memory is read in tiers so context stays bounded as the
project grows. The full policy, tier definitions, and budget numbers
live in `AGENTS.md` → "Before every task". This guide does not
restate them — read them from `AGENTS.md` so there is one source of
truth.

The end-of-task update runs a size check. When any file crosses its
budget, the agent proposes running `prompts/prune-memory.md` — never
auto-prunes. The prune workflow archives older content whole
(append-only entries are never rewritten) and leaves a one-line index
in the live file pointing at each archive.

A fresh project has no `archive/` folder. It is created lazily on
the first prune.
