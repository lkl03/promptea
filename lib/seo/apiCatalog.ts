// lib/seo/apiCatalog.ts
//
// v1.9.0 — what Promptea offers to programs, in the two formats agents look
// for: an API catalog (RFC 9727, a linkset at /.well-known/api-catalog) and an
// OpenAPI description of the one public, read-only JSON endpoint.
//
// Only endpoints meant for third parties are listed. The analyzer, the matcher
// and the flow are same-origin tools behind rate limits and (for the flow) a
// spend cap; publishing them here would invite traffic they are not built for.

import { APP_VERSION } from "@/lib/version";

export const API_CATALOG_CONTENT_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export type Linkset = { linkset: Array<Record<string, unknown>> };

export function apiCatalog(siteUrl: string): Linkset {
  return {
    linkset: [
      {
        anchor: `${siteUrl}/api/benchmarks`,
        "service-desc": [{ href: `${siteUrl}/api/openapi.json`, type: "application/openapi+json" }],
        "service-doc": [{ href: `${siteUrl}/en/benchmarks.md`, type: "text/markdown" }],
        status: [{ href: `${siteUrl}/api/benchmarks`, type: "application/json" }],
      },
    ],
  };
}

export function openApiDocument(siteUrl: string): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Promptea public API",
      version: APP_VERSION,
      description:
        "Read-only data Promptea publishes for programs. The site's text is available as markdown: add .md to a page URL, or send Accept: text/markdown. Index: /llms.txt.",
    },
    servers: [{ url: siteUrl }],
    paths: {
      "/api/benchmarks": {
        get: {
          operationId: "getBenchmarksStatus",
          summary: "Status of the AI model benchmark data and the leader of each benchmark",
          description:
            "Whether the benchmarks page is serving live data or the last valid snapshot, its dates, and per benchmark the source, metric, number of models and current leader. Scores from different benchmarks are never combined. Cached for one hour.",
          responses: {
            "200": {
              description: "Benchmark status",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["status", "benchmarks", "frontier"],
                    properties: {
                      status: { type: "string", enum: ["live", "stale", "unavailable"] },
                      reason: { type: ["string", "null"] },
                      asOf: { type: ["string", "null"], description: "Date the data refers to" },
                      fetchedAt: { type: ["string", "null"] },
                      ageHours: { type: ["number", "null"] },
                      invalidRows: { type: ["number", "null"] },
                      benchmarks: {
                        type: "array",
                        items: {
                          type: "object",
                          required: ["key", "source", "metric", "models"],
                          properties: {
                            key: { type: "string" },
                            source: { type: "string" },
                            metric: { type: "string" },
                            models: { type: "integer" },
                            leader: {
                              type: ["object", "null"],
                              properties: { modelId: { type: "string" }, name: { type: "string" }, value: { type: "number" } },
                            },
                          },
                        },
                      },
                      frontier: { type: "array", items: { type: "string" }, description: "Model ids currently at the frontier" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
