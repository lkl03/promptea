// lib/agentReady/discovery.ts
//
// v1.9.0 — how an agent finds Promptea's MCP server from the domain alone.
//
// Two documents, both checked against their specs on 2026-11-27:
//   - the MCP Server Card (SEP-2127; schema in
//     modelcontextprotocol/experimental-ext-server-card), served next to the
//     MCP endpoint at /api/mcp/server-card;
//   - the AI Catalog (ARD), served at /.well-known/ard.json (the current path)
//     and /.well-known/ai-catalog.json (its predecessor, still what the MCP
//     discovery docs and Cloudflare's scanner read).
//
// The server is one per audit session, so the card's URL is a template: the
// `{session_id}` segment is the id Promptea shows after an audit.

import { APP_VERSION } from "@/lib/version";

export const SERVER_CARD_CONTENT_TYPE = "application/mcp-server-card+json";
export const AI_CATALOG_CONTENT_TYPE = "application/ai-catalog+json";
export const SERVER_CARD_SCHEMA = "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json";

/** Reverse-DNS name of the server: `me.promptea/agent-ready`. */
export const SERVER_CARD_NAME = "me.promptea/agent-ready";

export function serverCard(siteUrl: string) {
  return {
    $schema: SERVER_CARD_SCHEMA,
    name: SERVER_CARD_NAME,
    version: APP_VERSION,
    title: "Promptea Agent-Ready",
    // The schema caps the description at 100 characters.
    description: "Read a Promptea Agent-Ready audit of your site and implement its fixes.",
    websiteUrl: `${siteUrl}/en/agent-ready`,
    remotes: [
      {
        type: "streamable-http",
        url: `${siteUrl}/api/mcp/{session_id}`,
        variables: {
          session_id: {
            description: "The audit session id Promptea shows after an Agent-Ready audit (valid for 14 days).",
            isRequired: true,
            isSecret: true,
            format: "string",
          },
        },
      },
    ],
  };
}

export function aiCatalog(siteUrl: string) {
  const host = new URL(siteUrl).hostname.replace(/^www\./, "");
  return {
    specVersion: "1.0",
    host: { displayName: "Promptea", documentationUrl: `${siteUrl}/llms.txt` },
    entries: [
      {
        identifier: `urn:air:${host}:mcp/agent-ready`,
        displayName: "Promptea Agent-Ready MCP server",
        description: "Per-audit MCP server: read an Agent-Ready audit of a website, get stack-specific fixes with code and acceptance checks, mark progress and re-scan.",
        type: SERVER_CARD_CONTENT_TYPE,
        url: `${siteUrl}/api/mcp/server-card`,
        version: APP_VERSION,
        representativeQueries: [
          "how ready is my website for AI agents",
          "make my Next.js site readable by AI agents",
          "serve markdown to agents with Accept: text/markdown",
          "fix my site's Agent-Ready audit",
        ],
      },
    ],
  };
}

export const DISCOVERY_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Access-Control-Expose-Headers": "ETag",
  "Cache-Control": "public, max-age=3600",
  "X-Content-Type-Options": "nosniff",
};
