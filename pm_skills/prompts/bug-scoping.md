# Bug Scoping

Using the project context, do the bug scoping step only for the current bug.

Bug:
<describe the bug — what's expected vs what's happening>

Output:

1. Bug description — expected behaviour, actual behaviour, reproduction steps (if reproducible).
2. Affected areas — which modules, files, or layers are involved.
3. Root-cause analysis — search the codebase, trace the fault, cite evidence. State the root cause, not symptoms.
4. Regression surface — what existing behaviour could break if this area is changed.
5. Proposed fix — the minimal upstream change that addresses the root cause.
6. Acceptance criteria — how we know the bug is fixed and no regressions were introduced.
7. Open questions — only if genuinely blocking.

Rules:

- Search the codebase before diagnosing. Cite file paths and line ranges as evidence.
- Prefer upstream fixes over downstream workarounds.
- If the root cause is uncertain, state competing hypotheses and what evidence would distinguish them.
- Keep the proposed fix minimal. No speculative refactors.
- Flag any architectural, performance, or regression risks.
- No code or pseudocode.
