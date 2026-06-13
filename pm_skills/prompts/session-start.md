# Session Start

Read these files at the start of each task session. `AGENTS.md`
may already be loaded as a global rule; the other files must be
read explicitly.

## Context to load

Load the standard project context per `AGENTS.md` → "Before every
task". The canonical hot-read list and tier policy live there. The
list below is a quick reference — `AGENTS.md` is authoritative.

**Hot whole-file** (read every task):

- `README.md`
- `AGENTS.md` (skip if already loaded as a global rule)
- `pm_skills/project/brief.md`
- `pm_skills/project/architecture.md`
- `pm_skills/project/conventions.md` (if it exists)
- `pm_skills/project/file-map.md`
- `UI-STANDARDS.md` — only if the task touches UI
- `DEV-INFRASTRUCTURE.md` (if it exists) — only if the task touches build/dev

**Hot sectional** (read by section, not whole):

- `pm_skills/project/backlog.md` — Active section only (open work).
- `pm_skills/project/decision-log.md` — latest 10 entries only.
  Search older entries on demand if the task requires prior-decision context.

**Warm** (read on demand, not every task):

- `pm_skills/project/trajectory.md` — shipped-work narrative; read during roadmap-refactor, release, or when reconstructing what shipped.

**Cold** (do not auto-load):

- `pm_skills/project/wish-list.md` — capture inbox; read only during triage (see `next-batch.md`).
- `pm_skills/project/archive/*.md` — search via grep only when explicitly relevant.

## Then state the task

### Standard start (full 4-stage task)

> My task: [one sentence from the backlog]
> Start with scoping only. No code.

### Quick start (small task)

> My task: [one sentence]
> This is a small task. Scope it, plan it, and present the plan for approval. No code yet.

### Bug start

> My task: [bug description — what's expected vs what's happening]
> This is a bug. Start with diagnosis. No code.

### Continuing a previous task

> I'm continuing work on: [task description]
> Here's where I left off: [brief status]
