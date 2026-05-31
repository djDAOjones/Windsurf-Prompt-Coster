# Release

Run this in the **framework source repo** (not a consuming project)
whenever you change any `framework`-class file. It keeps `VERSION`,
`CHANGELOG.md`, and `MANIFEST.md` in sync so that downstream upgrades
stay a declarative read instead of a forensic diff.

If `VERSION`, the changelog, and the manifest drift out of sync, the
upgrade fast path silently breaks and every consuming project pays the
full-diff cost again. This checklist is the safeguard.

## 1. Decide the bump

Classify the change against `CHANGELOG.md` semver rules:

- **patch** — wording, clarification, or fix. No new files, no
  migration.
- **minor** — new file or capability, backward compatible (a new
  prompt, integration, or template section).
- **major** — structural or breaking change needing a migration
  (renamed/removed files, restructured templates, changed memory
  contracts).

State the chosen level and a one-line reason before editing metadata.

## 2. Bump `VERSION`

Overwrite `pm_skills/VERSION` with the new number. One line, no
prefix (e.g. `1.2.0`).

## 3. Append a changelog entry

Prepend a new entry to `pm_skills/CHANGELOG.md` (newest at top, never
rewrite a published entry). Use this shape:

```markdown
## X.Y.Z — YYYY-MM-DD

One-line summary of the release.

### Added
- `path` — what and why.

### Changed
- `path` — what and why.

### Removed
- `path` — what and why.

### Upgrade actions
- The mechanical steps to move a project from the previous version to
  this one, oldest concern first. Name exact paths. Flag any path that
  needs the Step 4 customisation check or a project-memory migration.
```

Omit empty sections. The **Upgrade actions** block is mandatory — it
is what `prompts/upgrade.md` executes.

## 4. Update the manifest

If this release added, removed, renamed, or reclassified any path,
update `pm_skills/MANIFEST.md`:

- New file in `prompts/` or `integrations/` → inherits `framework`;
  add a row only if you want it explicit.
- New file elsewhere, or a class that differs from its directory
  default → add an explicit row and state the class in the changelog
  entry.
- Removed file → delete its row.

## 5. Update wiring docs

- `pm_skills/GUIDE.md` — update the "What's in this folder" file tree
  and any per-task lists if files were added or removed.
- `README.md` — update only if the change affects quick start,
  upgrading, or "what's in this repo".

## 6. Verify

- `pm_skills/VERSION` matches the new top changelog entry.
- The changelog entry has an **Upgrade actions** block.
- `MANIFEST.md` lists every shipped path (no orphans, no missing new
  files).
- `GUIDE.md` file tree matches the actual `pm_skills/` contents.

Run a quick consistency check:

```sh
echo "VERSION: $(cat pm_skills/VERSION)"
echo "Top changelog heading:"; grep -m1 '^## ' pm_skills/CHANGELOG.md
echo "Files not in MANIFEST:"
for f in pm_skills/prompts/* pm_skills/integrations/*; do
  grep -q "$(basename "$f")" pm_skills/MANIFEST.md || \
  echo "  (ok if covered by a /* wildcard) $f"
done
```

## Rules

- One version bump per release. Do not batch unrelated changes under
  one number without listing them all.
- The changelog is append-only. Fix a mistake with a new entry, never
  by editing a published one.
- Never bump `VERSION` without an Upgrade actions block — a version
  with no documented deltas forces consuming projects back to a full
  diff.
