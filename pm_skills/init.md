# Initialize Your Project

Follow these steps to go from a blank project to "ready for first task."
Total time: ~30 minutes.

This process populates two kinds of project memory:

- **`project/`** — living project memory (brief, backlog, file map,
  decisions). Read at the start of every task session.
- **`AGENTS.md` + `UI-STANDARDS.md` + `DEV-INFRASTRUCTURE.md`** —
  permanent behavioral contracts. Loaded automatically by AI tools that
  support global rules, or read manually at session start for other
  tools.

Both are kept in sync. The kickoff process gathers information once and
writes it to the right places.

## Prefer to let the agent build it?

This guide is the fully manual path — you drive every step. If instead you
have wants or specs and want the agent to do the work, use
`integrations/init-mvp.md`. You review and **sign off the foundation** (the
product read, the stack, and the MVP backlog), and then it builds the
first-milestone MVP to completion without further gates — de-risked by
staged rollback checkpoints. It applies the same rigour (design-before-code,
Carbon, WCAG 2.2 AAA, minimal dependencies, live project memory). Come back
to this guide whenever you want to drive the setup yourself.

## Minimum viable setup

If you want to start fast, complete only these now:

- Step 1 (`brief.md`)
- Step 2 (`architecture.md`)
- Step 3 (`backlog.md`)
- Step 5 (`README.md`)
- Step 6 — at minimum, populate the **Product identity** section of
  `AGENTS.md`

Everything else (conventions, UI standards, dev infrastructure,
scaffold, full readiness check) can be deferred to first use. Picking
up deferred items as you encounter them produces no rework: each step
only adds content, it does not rewrite earlier choices.

---

## Step 1: Fill in the project brief

Open `project/brief.md` and answer each question.

Keep it short — a few sentences per section is fine. You can always
expand later. This is the seed that everything else grows from.

---

## Step 2: Generate the architecture

Start a chat with your AI tool and paste this:

```text
Read pm_skills/project/brief.md.

Based on this brief, propose:
1. A recommended tech stack with a one-line justification per choice.
2. A folder and file structure for the project.
3. Key modules or components, with a one-sentence responsibility for each.
4. Communication patterns — how modules should interact (e.g. pub-sub
   event bus, direct imports, state store). Name the preferred pattern.
5. A dependency policy — what's allowed without approval.
6. A dev workflow — how to install, run in development, build for
   production, and run tests. Include the expected dev URL and port.
7. A configuration strategy — where tuneable values, constants, and
   design tokens should live.

Keep it practical and minimal. This is a starting point, not a final architecture.
Output in markdown format matching the template in pm_skills/project/architecture.md.
```

Review the output. Edit until you agree with it. Save the result to
`project/architecture.md`, replacing the template comments.

---

## Step 3: Generate the initial backlog

In the same chat (or a new one), paste this:

```text
Read:
- pm_skills/project/brief.md
- pm_skills/project/architecture.md

Based on the brief and architecture, propose an initial backlog of
8–12 OPEN tasks that would take this project from zero to a working
first milestone. The backlog holds open work only — there is no
Completed section; shipped work will later move to trajectory.md.

Use the ticket grammar from pm_skills/project/backlog.md:
- Quick items stay one line:  - [ ] Short title — one-sentence outcome.
- Non-trivial or sign-off items add two lines so intent survives
  compression:
    - [ ] **ID Short title** [flags]
      Intent: the outcome wanted.
      Done when: the acceptance condition.
  Optional flags: [sign-off] (scope sign-off first), [blocked: X],
  [spike] (timeboxed investigation).

Group tasks under milestone headings (Current milestone / Next
milestone), with an Icebox for anything deferred. Order by dependency.
Keep tasks small enough to complete in a single focused session.
Output in markdown matching the template in pm_skills/project/backlog.md.
```

Review the output. Reorder, add, or remove tasks. Save to
`project/backlog.md`.

`project/wish-list.md` and `project/trajectory.md` ship empty — the
capture inbox for unscoped ideas, and the shipped-work narrative that
fills as you complete tasks. Leave both as-is; no population is needed
at init.

---

## Step 4: Set initial conventions (optional)

If you already know your preferred code style, naming patterns, commit
format, or testing approach, fill in `project/conventions.md` now.

If you're not sure yet, skip this. Conventions will emerge naturally
once you start writing code. Capture them in `project/conventions.md`
when they do.

---

## Step 5: Create a root README.md

`AGENTS.md` tells AI agents to read `README.md` at the start of every
task. Create a root `README.md` for your project now.

It does not need to be long. Include:

- **What this project is** — one paragraph.
- **How to run it** — build/serve commands, prerequisites.
- **Key infrastructure** — important modules, entry points, gotchas.
- **Invariants** — anything a contributor must not break.

You can generate a first draft from your brief and architecture:

```text
Read:
- pm_skills/project/brief.md
- pm_skills/project/architecture.md

Draft a concise root README.md for this project. Include:
1. One-paragraph description of the project.
2. How to run or build it (commands, prerequisites).
3. Key modules and entry points.
4. Any invariants or gotchas a contributor should know.

Keep it short — this is a working reference, not marketing copy.
```

Review and save to the project root as `README.md`.

---

## Step 6: Populate AGENTS.md

`AGENTS.md` is the permanent behavioral contract for AI agents. It
contains `<!-- CUSTOMISE -->` placeholder sections that should be filled
in using the information gathered in Steps 1–5.

For shape examples (core data model, protected infrastructure,
event naming, persistence checklist, etc.), see **Appendix A** at the
bottom of this file.

In the same chat (or a new one), paste this:

```text
Read:
- pm_skills/project/brief.md
- pm_skills/project/architecture.md
- pm_skills/project/conventions.md (if it exists)
- AGENTS.md

AGENTS.md has <!-- CUSTOMISE --> placeholder sections. Using the brief,
architecture, and conventions, populate every applicable placeholder:

1. **Product identity** — Replace [Project Name] and [short product
   description] with the real product name and a 2–4 sentence
   description. State what the app IS and what mental model is
   canonical. Optionally state what it is NOT.

2. **Hard rules (invariants)** — Add project-specific invariants below
   the existing universal ones. Consider: canonical data formats,
   cross-component communication rules, specific token systems,
   programmatic update patterns to avoid feedback loops.

3. **Core data model** — If there are canonical entities, describe them.
   State which patterns are explicitly forbidden.

4. **Domain subsystems** — If the architecture defines subsystems
   (simulation, rendering, data pipeline, etc.), add a section for each
   describing the design contract.

5. **Relationship to prior work** — If this project was forked from or
   shares history with another codebase, fill in that section.

6. **Protected infrastructure** — If there are modules that must not be
   deleted or restructured without approval, list them.

7. **Event naming convention** — Fill in the event naming section
   with the project's actual namespaces, or remove the section if
   the project doesn't use events.

8. **Files to never edit** — List build output dirs, personal notes, or
   other paths agents must never touch.

9. **Anti-patterns** — Add project-specific anti-patterns below the
   universal ones.

10. **Testing** — Keep the testing doctrine as the default. Add any
    project-specific invariants or anti-patterns; record the runner,
    config, and what-to-test in `project/conventions.md`.

11. **Persistence checklist** — If the project has stateful models
    that persist to localStorage or files, fill in the checklist.
    If not applicable, remove the section.

12. **Code documentation** — Confirm or adjust the documentation
    standard (e.g. JSDoc for JavaScript).

Only fill in sections where the brief and architecture provide enough
information. Leave remaining placeholders for later. Do not invent
information.

Output the updated AGENTS.md in full.
```

Review the output. Save the result to `AGENTS.md`, replacing the
template version.

**Optional — tool-specific workflows:** If your AI tool supports
workflows, copy the files from `integrations/` to your tool's workflow
directory. The prompt files in `prompts/` serve the same purpose for
tools without workflow support.

---

## Step 7: Populate UI-STANDARDS.md (if the project has UI)

If this project has a user interface, paste this:

```text
Read:
- pm_skills/project/brief.md
- pm_skills/project/architecture.md
- UI-STANDARDS.md

UI-STANDARDS.md has a <!-- CUSTOMISE --> placeholder for the token
systems section. Using the brief and architecture:

1. Define the token systems used by this project.
2. If the project uses a brand palette alongside Carbon structural
   tokens, describe both systems and state they must not be collapsed.
3. If the project has a single token system, describe it.

Output only the updated "Token systems" section.
```

Review and save to the Token systems section of `UI-STANDARDS.md`.

If this project has no user interface, the UI-STANDARDS.md file can be
removed from the boilerplate.

---

## Step 8: Populate DEV-INFRASTRUCTURE.md (if the project has a build step)

If this project uses a package manager, bundler, dev server, or build
step, populate `DEV-INFRASTRUCTURE.md` now. If the project is pure
static files with no build tooling, skip this step — the file can be
removed from the boilerplate.

For shape examples per section (package management, scripts table,
dev server, build, version, deploy, configuration, etc.), see
**Appendix B** at the bottom of this file.

In the same chat (or a new one), paste this:

```text
Read:
- pm_skills/project/brief.md
- pm_skills/project/architecture.md
- DEV-INFRASTRUCTURE.md

DEV-INFRASTRUCTURE.md has <!-- CUSTOMISE --> placeholder sections.
Using the brief and architecture, populate every applicable placeholder:

1. **Package management** — package manager, dependency policy.
2. **Canonical scripts** — table of every script in package.json.
3. **Dev server** — canonical URL, port, how to start, what it serves.
4. **Build system** — bundler, entry point, output directory, source
   maps, minification, static file handling.
5. **Version management** — numbering scheme, sources, auto-increment
   rules, when to bump manually.
6. **Deployment** — target, pipeline, post-deploy verification.
7. **Utility scripts** — any helper scripts beyond dev/build/test.
8. **Configuration strategy** — where constants, design tokens, and
   user-facing config live.
9. **Editor config** — describe the .editorconfig if one exists.
10. **Files agents must not hand-edit** — concrete paths.

Only fill in sections where the architecture provides enough
information. Leave remaining placeholders for later. Do not invent
information.

Output the updated DEV-INFRASTRUCTURE.md in full.
```

Review the output. Save the result to `DEV-INFRASTRUCTURE.md`,
replacing the template version.

---

## Step 9: Copy scaffold files

Copy the following from `pm_skills/scaffold/` to
your project root, if they don't already exist:

- **`.editorconfig`** — editor style enforcement (indent, encoding,
  line endings). Useful for any project, not just those with a build
  step. Customise to match your preferences.
- **`.gitignore`** — common ignores for JS/npm projects. Adapt for
  your stack if needed.

---

## Step 10: Readiness check

Before starting your first task, confirm:

- [ ] `project/brief.md` is filled in.
- [ ] `project/architecture.md` is filled in.
- [ ] `project/backlog.md` has an initial task list.
- [ ] Root `README.md` exists.
- [ ] `AGENTS.md` has been populated — no remaining `[Project Name]`
  or `[short product description]` placeholder.
- [ ] `UI-STANDARDS.md` token systems section is populated (if the
  project has UI).
- [ ] `DEV-INFRASTRUCTURE.md` is populated (if the project has a build
  step or dev server).
- [ ] `.editorconfig` is in the project root.
- [ ] `.gitignore` is in the project root.

Then run a placeholder lint:

```sh
grep -nE '\[Project Name\]|\[short product description\]|<!-- CUSTOMISE' \
  AGENTS.md UI-STANDARDS.md DEV-INFRASTRUCTURE.md 2>/dev/null
```

Review each hit. For each remaining `<!-- CUSTOMISE -->` marker,
either populate the section or leave it as a deliberate "not
applicable" stub. Bracketed `[placeholder]` strings should not
remain in populated sections.

If any of the boxes above are unchecked, finish them before
proceeding — unless you are following the **Minimum viable setup**
path, in which case the deferred items can be completed on first
use.

---

## Step 11: Start your first task

Open `project/backlog.md` and pick the first task.

If your AI tool supports workflows and you copied `integrations/`
in Step 6, run one of the task workflows and state your task:

- `feature.md` — full 4-stage workflow with approval gates (default).
- `bugfix.md` — diagnosis-before-fix workflow with approval gates.
- `auto-jazz.md` — same 4 stages as `feature.md` but no approval
  gates. The agent picks the recommended option, states each
  assumption, and only asks if something is genuinely blocking.
  Hard prohibitions (dependency adds, protected files, destructive
  migrations, large refactors, weakening tests) still apply.
- `auto-jazz-lite.md` — fast 2-stage flow (scope+plan, then
  implement+verify+housekeep) with no approval gates. Hard
  prohibitions still apply. Use for small or low-risk tasks.

Otherwise, follow the manual prompt workflow below.

For non-trivial tasks (4-stage):

1. Open a new chat.
2. Paste the **Standard start** section from `prompts/session-start.md`.
3. Use `prompts/scoping.md` — approve the scope.
4. Use `prompts/design-options.md` — pick an option.
5. Use `prompts/implementation-plan.md` — approve the plan.
6. Use `prompts/validation.md` — confirm readiness.
7. Say "go ahead and implement."
8. When done, paste `prompts/end-of-task.md`.

For small or simple tasks (single-stage):

1. Open a new chat.
2. Paste the **Quick start** section from `prompts/session-start.md`.
3. Use `prompts/quick-task.md` — approve the plan.
4. Say "go ahead and implement."
5. When done, paste `prompts/end-of-task.md`.

---

## You're set up

From here, the cycle is: pick a task → scope/plan → implement → update
project memory → pick the next task. To let the agent pick for you,
start a chat with `prompts/next-batch.md` — it selects the next logical
backlog batch and presents it for your go-ahead.

The files in `project/` are your living memory. `README.md`,
`AGENTS.md`, `UI-STANDARDS.md`, and `DEV-INFRASTRUCTURE.md` are your
permanent project references. Keep them all current and every new
chat can pick up where the last one left off.

## Memory hygiene

Project memory uses tiered reads (see AGENTS.md → "Before every task")
and soft word budgets so context stays bounded as the project grows.

The core habit that keeps it lean is **compress-on-ship**: the backlog
holds open work only; the moment a task ships, `end-of-task.md` removes
its backlog item, adds one line to `trajectory.md` (the outcome), and
records the *why* once in `decision-log.md`. Nothing accumulates in the
hot/active layer — that is what stops the backlog becoming an audit
trail of shipped work.

- Every end-of-task update runs a size check. If a budget is
  exceeded, the agent proposes running
  `pm_skills/prompts/prune-memory.md` — it does not auto-prune.
- Structural drift the size check can't see (stray `[x]` work, dated
  rounds, stale paths) is repaired by `roadmap-refactor.md` and
  surfaced by the read-only `doctor-memory.md`.
- `pm_skills/project/archive/` is created lazily on the first prune.
  A fresh project has no archive folder.
- Archives are cold (never auto-read). Search via grep when
  explicitly relevant.

You should not need to touch any of this manually until a budget
trips. When that happens, approve the prune proposal and let the
workflow do the rest.

---

## Appendix A — Step 6 reference: AGENTS.md section examples

Use these examples as shape references when populating `AGENTS.md`
in Step 6. The stub markers in `AGENTS.md` point here. None of
these are mandatory — adapt or omit per project.

### Hard rules (project-specific invariants) examples

Add bullets below the universal hard rules. Examples:

- Canonical data formats (e.g. normalised coordinates, UTC timestamps).
- Cross-component communication rules (e.g. EventBus-only, no direct calls).
- Specific token systems and how they coexist.
- Programmatic update patterns to avoid feedback loops.

### Core data model example

```markdown
## Core data model

The canonical model is:

- **`EntityA`** — id, properties…
- **`EntityB`** — id, relationships…

Do **not** introduce [anti-pattern X] or [legacy pattern Y].
```

### Protected infrastructure example

```markdown
## Protected infrastructure

| Module | Role | Notes |
| --- | --- | --- |
| `example.js` | Description | Migration plan or n/a |

Do not delete, rename, or restructure protected modules without
explicit approval.
```

### Event naming convention example

```markdown
## Event naming convention

Use colon-separated namespaces for all events. Group by domain:

- `domain:entity:action` for model events.
- `ui:component:action` for UI events.
- `app:lifecycle:action` for application-level events.
```

If the project uses hooks, direct imports, or another pattern
instead of events, state that here and remove the namespace
guidance.

### Testing policy stages

The permanent doctrine (invariants over coverage, named categories,
fast-and-hermetic, two layers, never silently weaken a test) lives in
`AGENTS.md`. This section records where *this* project sits on the
ramp today:

1. **Pre-invariant (MVP/greenfield).** Manual verification only.
   Correct to defer tests until invariants stabilise — say so.
2. **Safety net.** Vitest (or stack equivalent) for logic, validation,
   and boundary/API tests via in-process injection; a regression test
   per fixed bug; round-trip tests for persisted state.
3. **Journeys.** Playwright (or equivalent) for the few real-environment
   flows that would break trust if they failed.

Record the runner config and this project's specific invariants in
`conventions.md`. Update as the suite matures.

### Persistence checklist examples

JS app with manual serialisation:

```markdown
## Persistence checklist

When adding any property that should survive reload:

1. Default in constructor (relevant model class).
2. Include in serialisation (`toJSON()` or equivalent).
3. Handle in deserialisation (`fromJSON()` or equivalent) with
   fallback default.
4. Serialise in auto-save.
5. Restore in load/auto-load.
```

ORM-based app:

```markdown
## Persistence checklist

When adding any field that should survive reload:

1. Add the field to the model definition.
2. Create and run a migration.
3. Handle the field in any import/export functions with a fallback
   default.
4. Verify it persists correctly via the ORM layer.
```

If the project has no persistence layer, remove this section.

### Files to never edit examples

```markdown
- docs/ or dist/ — build output, overwritten on every build.
- version.json — managed by the build script.
- node_modules/ — managed by npm.
- package-lock.json — managed by npm (commit but do not edit).
```

### Anti-pattern examples (project-specific)

```markdown
- Iterating data as if it has an implicit order when it doesn't.
- Using a legacy abstraction as a design reference.
- Collapsing parallel token systems into one.
```

---

## Appendix B — Step 8 reference: DEV-INFRASTRUCTURE.md section examples

Use these examples as shape references when populating
`DEV-INFRASTRUCTURE.md` in Step 8. Adapt to your stack.

### Package management example

```markdown
Package manager: **npm**

- `package.json` lives in the project root.
- **Runtime dependencies** require explicit approval. The default is
  zero runtime dependencies.
- **Dev dependencies** (bundler, test runner, linter) can be added
  when justified by the architecture.
- Run `npm install` after cloning. Do not commit `node_modules/`.
```

### Canonical scripts example

```markdown
| Script | Command | Purpose | When to use |
| --- | --- | --- | --- |
| `dev` | `node build.js --watch --serve` | Dev server with hot reload | Day-to-day development |
| `build` | `NODE_ENV=production node build.js` | Production build | Before deploy |
| `test` | `vitest run` | Run tests once | After every change |
| `test:watch` | `vitest watch` | Tests in watch mode | During development |
| `push` | `node push.js` | Build + commit + push | When ready to ship |

Do not add scripts without updating this table.
```

### Dev server example

```markdown
- **URL:** `http://localhost:3000`
- **Start:** `npm run dev`
- **Serves:** Build output from `docs/` (esbuild rebuilds on change)
- **Hot reload:** JS changes trigger esbuild rebuild automatically.
  CSS and HTML changes are watched and copied to the output directory.

All development and testing should use this URL. Do not hard-code
alternative ports or URLs.
```

### Build system example

```markdown
- **Bundler:** esbuild (via custom `build.js`)
- **Entry point:** `src/main.js`
- **Output directory:** `docs/` (also serves as GitHub Pages root)
- **Format:** ESM, target ES2020
- **Source maps:** Enabled in both dev and production
- **Minification:** Production builds only
- **Static files:** `index.html`, `styles/*.css`, and `images/` are
  copied to the output directory by the build script.

The output directory is **read-only** — never hand-edit files in it.
They are overwritten on every build.
```

### Version management example

```markdown
Format: `major.minor.build` (e.g. `3.1.76`)

| Component | Source | Updated | Example |
| --- | --- | --- | --- |
| `major.minor` | `package.json` version field | Manually, for features or breaking changes | 3.0 → 3.1 |
| `build` | `version.json` build field | Automatically, once per dev session | 3.1.75 → 3.1.76 |

The combined version is injected at build time. Do not edit
`version.json` manually — the build script manages it.
```

### Deployment example

```markdown
- **Target:** GitHub Pages (served from `docs/` on `main` branch)
- **Pipeline:** `npm run build:deploy` → builds to `dist/`, copies to
  `docs/`, ready to commit and push.
- **Post-deploy:** Verify the live URL matches the latest build
  version.
```

### Utility scripts example

```markdown
- **`push.js`** — Runs a production build, stages all changes, commits
  with a version-stamped message, and pushes to the remote. Safe to
  run without review for routine commits. Does not force-push.
```

### Configuration strategy example

```markdown
- **Constants:** `src/config/constants.js` — all tuneable values
  grouped by domain.
- **Design tokens:** `styles/tokens.css` — CSS custom properties for
  colours, spacing, and theming.
- **Keybindings:** `src/config/keybindings.js` — all mouse and
  keyboard shortcuts.

Do not scatter configuration across service files.
```

### Editor config example

```markdown
The project root contains `.editorconfig` for mechanical style
enforcement: UTF-8, LF, 2-space indentation, trailing whitespace
trimmed (except in markdown), single quotes in JavaScript.
```

### Files agents must not hand-edit example

```markdown
- `docs/` — build output, overwritten on every build.
- `dist/` — intermediate build output.
- `version.json` — managed by the build script.
- `node_modules/` — managed by npm.
- `package-lock.json` — managed by npm. Do not edit manually, but
  do commit it.
```
