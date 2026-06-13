# Validation — Stage 4 of 4

Using the project context, chosen design, and implementation plan, do a pre-code validation pass.

Chosen option:
<paste chosen option, or say "use the option from above">

Implementation plan:
<paste plan, or say "use the plan from above">

Output:

1. Design sanity checks — does this actually solve the problem?
2. Architecture checks — does this respect module boundaries?
3. Regression risks — what existing behavior could break?
4. Test plan — name the invariants at risk, then the categories that
   apply (happy path, empty, error, boundary, permission/gating,
   regression, persistence round-trip). "Not applicable" is a valid
   answer per category. Flag anything only a manual check can cover.
5. Edge cases — what might we miss?
6. Signs the scope is too large or the design is wrong.

Rules:

- Say "not applicable" for irrelevant checks.
- Separate pre-existing issues from task-induced risks.
- Keep it concrete and actionable.
- No code.
