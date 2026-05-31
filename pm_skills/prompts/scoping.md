# Scoping — Stage 1 of 4

Using the project context, do the scoping step only for the current task.

Output:

1. Problem framing — what needs to change and why.
2. Affected areas — which modules, files, or layers are involved.
3. Key design decisions — what choices need to be made.
4. Risks and dependencies — what could go wrong or block progress.
5. Smallest useful scope — the minimum that delivers value.
6. Out of scope — what we're explicitly not doing.
7. Target file list — files to create or modify, with one-line reason each.
8. Open questions — only if genuinely blocking.

Rules:

- Search the codebase before drawing conclusions.
- Prefer existing patterns over new abstractions.
- Flag any efficiency, persistence, or architectural concerns.
- Out-of-scope items worth revisiting → append each to `pm_skills/project/wish-list.md` as a one-line idea (don't expand this task to do them).
- If this is a new project with little or no code yet, focus on folder structure and module responsibilities instead of file-level detail.
- No code or pseudocode.
