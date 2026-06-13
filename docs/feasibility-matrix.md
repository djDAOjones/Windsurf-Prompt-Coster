# Feasibility Matrix

What is technically possible for a Cascade per-turn cost meter, based on
**official Windsurf documentation** (fetched 2026-05-31) plus one community
project used only as an architecture proof.

## Sources

- **Cascade Hooks** — <https://docs.windsurf.com/windsurf/cascade/hooks>
- **Cascade Analytics API** — <https://docs.windsurf.com/windsurf/accounts/api-reference/cascade-analytics>
- **Models / pricing** — <https://docs.windsurf.com/plugins/cascade/models>
- **Usage / credits / ACUs** — <https://docs.windsurf.com/windsurf/accounts/usage>
- **Architecture proof (community, not a dependency)** —
  `staronelabs/windsurf-cli` <https://github.com/staronelabs/windsurf-cli>

## Verdict legend

- **Confirmed** — documented and dependable.
- **Partial** — possible with caveats / not exact.
- **Unverified** — must be probed on a real machine before relying on it.
- **Not feasible** — documented as unsupported, or no official path.

## Matrix

| # | Question | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Can a hook run after a Cascade turn completes? | **Confirmed** | Two events: `post_cascade_response` (markdown summary inline in `tool_info.response`) and `post_cascade_response_with_transcript` (full conversation as a JSONL file at `tool_info.transcript_path`). Both fire asynchronously after the response. |
| 2 | Does the hook payload give the model name? | **Confirmed** | Common field `model_name` ("Claude Sonnet 4", "GPT 4.1", …), the same label as the model selector; `"Unknown"` when undetectable. |
| 3 | Conversation / turn IDs and timestamp? | **Confirmed** | Common fields `trajectory_id` (conversation), `execution_id` (single turn), `timestamp` (ISO 8601). |
| 4 | Response text available? | **Confirmed** | `post_cascade_response` → `tool_info.response`; full detail in the `…_with_transcript` JSONL. Docs warn it "may contain sensitive" data and the per-step structure "may change". |
| 5 | Prompt / full context text available? | **Partial** | `pre_user_prompt` exposes `user_prompt`; the transcript JSONL holds "the full conversation from the beginning". Neither exposes the *true* model input (system prompt, rules, retrieved files, tool output), so input-token estimates undercount real billed input. |
| 6 | Exact per-turn token counts? | **Not feasible (official)** | No hook field carries token counts; the docs never mention them. The estimator must approximate. |
| 7 | Exact per-turn cost from Windsurf? | **Not feasible (official)** | Analytics `cascade_runs` returns `promptsUsed` = **credits in cents**, aggregated **per day / model / `cascadeId`** — not per turn, not tokens, and Teams/Enterprise-only (needs a `service_key`). |
| 8 | Map usage back to a turn for reconciliation? | **Partial / Unverified** | Analytics keys by `cascadeId` (conversation), not turn; whether `cascadeId` equals the hook's `trajectory_id` is **unconfirmed**. Daily granularity + pipeline latency rule it out for live per-turn cost. |
| 9 | Can a hook show a toast inside the Cascade chat? | **Not feasible (for this event)** | `show_output` does **not** apply to `post_cascade_response*` (they run async). Visible output must come from elsewhere (OS notification or an extension). |
| 10 | Can a hook show an OS notification? | **Confirmed** | A hook is any shell command, so it can call `osascript` (macOS), `notify-send` (Linux), or a PowerShell toast (Windows). |
| 11 | Can a Windsurf extension show `showInformationMessage` / status bar? | **Confirmed (standard VS Code API)** | Windsurf is VS Code-based and uses the **Open VSX** registry; the standard `vscode` extension API is available. Caveat: the MS Marketplace is unavailable — distribute via Open VSX or a local `.vsix`. |
| 12 | Can a hook talk to a running extension? | **Confirmed (indirect)** | Via the filesystem: hook writes a file, the extension watches with `fs.watch`. Proven by `staronelabs/windsurf-cli` (hook writes to `~/.windsurf-cli/`, extension reacts). No official direct hook→extension channel. |
| 13 | Where do Cascade transcripts live? | **Confirmed** | `~/.windsurf/transcripts/`, `0600` perms, directory **capped at 100 files** (oldest pruned by mtime). Read promptly; don't assume long retention. |
| 14 | Where can we keep our own logs? | **Confirmed (our choice)** | Anywhere local. Plan: `~/.cascade-cost-meter/` (config + `usage.jsonl`), outside the repo. |
| 15 | Per-model price list to compute $? | **Partial** | The models page lists models but in **ACU / credit multipliers**, not USD/token. For a $ figure use provider list prices (Anthropic/OpenAI/Google) in our own versioned config; in-house **SWE-*** models have no public USD/token rate → "cost unavailable". |
| 16 | Does a tool like this already exist? | **Confirmed: none found** | No first-party or prominent community per-turn cost notifier surfaced. Adjacent: `staronelabs/windsurf-cli` (control, not cost), `1Password/agent-hooks` (governance hooks). The hooks feature is purpose-built for exactly this consumer. |

## Hook payload reference (post-response events)

Common fields on every hook event:

`agent_action_name`, `trajectory_id`, `execution_id`, `timestamp`,
`model_name`, `tool_info`.

| Event | `tool_info` content | Delivery | `show_output`? |
| --- | --- | --- | --- |
| `post_cascade_response` | `response` (markdown summary of steps since last user input) | inline (stdin JSON) | **No** (async) |
| `post_cascade_response_with_transcript` | `transcript_path` (full conversation, JSONL, file contents + command output) | file on disk (`~/.windsurf/transcripts/`) | **No** (async) |

## What this means for the build

- **Feasible:** an after-the-fact, hook-driven, local **estimator** with an OS
  notification and a local JSONL log. This is the MVP.
- **Not feasible (no official path):** exact per-turn token counts or exact
  per-turn dollar cost. Hence "estimate" labelling is mandatory, not cosmetic.
- **Deferred:** in-IDE UI (extension via the file-watch bridge); Teams/Enterprise
  daily reconciliation via the Analytics API.
- **Transcript schema (confirmed 2026-05-31 on a real machine):** the
  `…_with_transcript` JSONL is an action stream of `{ status, type, <action>: {…} }`
  lines — user text at `user_input.user_response`, assistant text at
  `planner_response.response`, plus tool actions (`view_file`, `run_command`, …).
  The parser reads this shape (latest turn) and keeps a generic fallback for drift.
