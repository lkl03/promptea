// lib/agentReady/prompt.ts
//
// v1.9.0 — the fallback for people whose AI has no MCP: the same fixes the MCP
// server serves, in the plan's order, as one markdown prompt to paste.
//
// Built only from the fix catalog and the audit's vetted facts (ids, statuses,
// the origin): no text from the audited page goes into it.

import { getFix } from "./fixes";
import type { Audit, CheckId } from "./types";

export function buildFixPrompt(audit: Audit, order: readonly CheckId[]): string {
  const open = order.filter((id) => audit.checks.some((c) => c.id === id && c.status !== "pass"));
  const out: string[] = [
    `# Make ${audit.origin} ready for AI agents`,
    "",
    `You are working in the repository of the website ${audit.origin}. Promptea audited it for AI-agent readiness: it scored ${audit.score}/100. Implement the fixes below, in this order. For each one: apply it following the repository's own conventions, run its acceptance check against a local server, and tell me what you changed. Ask me before deciding anything that is mine to decide (robots and AI-training policy, which API endpoints are public, contact details).`,
    "",
    `Placeholders in ALL_CAPS are for you to fill in from the repository.`,
    "",
  ];
  open.forEach((id, i) => {
    const fix = getFix(id, audit.stack, audit.origin);
    out.push(`## ${i + 1}. ${fix.title} (+${fix.points} points, effort ${fix.effort})`, "", fix.why, "");
    for (const step of fix.instructions) out.push(`- ${step}`);
    if (fix.instructions.length > 0) out.push("");
    for (const file of fix.files) {
      out.push(`**${file.action === "create" ? "Create" : "Edit"} \`${file.path}\`**`, "", `\`\`\`${file.language}`, file.code, "```", "");
    }
    out.push(`**Acceptance:** ${fix.acceptance.description}`, "", "```sh", fix.acceptance.command, "```", "");
  });
  if (open.length === 0) out.push("Every check already passes. There is nothing to fix.", "");
  return out.join("\n").trimEnd() + "\n";
}
