import { RELAYED_MESSAGE_GUIDANCE } from '../domain/pull-inbox.js';
import { renderHarnessMonitorInstructions } from '../domain/harness-config.js';

/** Version of the generated agent workflow contract. */
export const CONCORD_INSTRUCTION_VERSION = '6';

/** Concise MCP-native guidance, versioned with the running server. */
export const CONCORD_SERVER_INSTRUCTIONS = `Concord coordinates coding agents through five workflow tools.
- Call start_work before editing. It registers your agent, claims or accepts the task, and reports overlaps.
- Use inspect_work to read workspace, task, agent, or message context. Use update_work for durable progress or to prompt/reply to another promptable workspace agent, including while that agent is busy.
- Use transfer_work for assignment, acceptance, decline, release, reassignment, evidence-bearing handoff offers, and reopening.
- Call finish_work before finishing, review, or closure with changed files, tests, assumptions, decisions, risks, and provenance.
Keep claims small and resolve reported overlaps before editing.
${RELAYED_MESSAGE_GUIDANCE}`;

/** Canonical fallback block written into supported client instruction files. */
export const CONCORD_INSTRUCTIONS = `## Concord — shared work-state for coding agents

<!-- concord:workflow-version=${CONCORD_INSTRUCTION_VERSION} -->

This project uses Concord MCP. Keep coordination to the five workflow tools:

- **Before editing**, call \`start_work\` with the task, your agent kind, and
  expected files or modules. It registers presence, accepts assigned work when
  appropriate, claims the scope, and returns overlap warnings. Concord derives
  your \`agent_id\` from your session — omit it unless your client told you one.
- Use \`inspect_work\` to read the workspace, one task, one agent, or one message
  thread. Use \`update_work\` for durable progress and for live prompts/replies
  to another promptable workspace agent, including while that agent is busy.
- Use \`transfer_work\` for assignment, acceptance, decline, release,
  reassignment, evidence-bearing handoff offers, and reopening.
- **Before finishing**, call \`finish_work\` once with the outcome, changed
  files, tests, assumptions, decisions, risks, guardrails, and provenance. It
  records evidence and can mark work review-ready or terminal.

Keep each claim small and resolve reported overlaps before editing. Concord
regenerates human-readable review artifacts in \`.concord/\`.

Enforcement remains client-dependent. \`concord doctor\` reports setup and
workflow adoption; optional hooks can block exact-file collisions.

${renderHarnessMonitorInstructions()}`;

/** MDC frontmatter used when creating a fresh Cursor rules file. */
export const CURSOR_MDC_HEADER = `---
description: Concord shared work-state tools for coding agents
alwaysApply: true
---
`;

/**
 * Machine-wide block written into each harness's global instruction file, so
 * agents use Concord in every repository, including ones never set up.
 */
export const GLOBAL_CONCORD_INSTRUCTIONS = `## Concord — shared work-state (machine-wide)

Concord is installed on this machine, and the user wants agents to use it in
every repository, including repositories where it has not been set up yet.

- If the repository root has no \`.concord/\` directory, set Concord up yourself
  before you edit: run \`concord setup --no-adapters\` from the repository root.
  Tell the user it ran and which files it wrote; they decide whether to commit
  them. \`.concord/\` itself is ignored by git.
- If Concord's MCP tools (\`start_work\`, \`inspect_work\`, \`update_work\`,
  \`transfer_work\`, \`finish_work\`) are available, use them: \`start_work\`
  before editing and \`finish_work\` before finishing.
- If the tools are still unavailable after setup, tell the user once to restart
  their coding client (and approve the project's \`concord\` MCP server), then
  carry on with the task.`;
