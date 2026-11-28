// lib/agentReady/fixes.ts
//
// v1.9.0 — the fix catalog: one fix per check, written by us, per stack.
//
// This text is what a coding agent receives through the MCP server and acts on
// inside somebody's repository, so it is deliberately STATIC: nothing from the
// audited page is interpolated into it. The only value filled in is the site's
// origin, which has been parsed and vetted as a URL. Site names, descriptions
// and the like stay as ALL_CAPS placeholders for the agent to take from the
// repository it is working in.
//
// Written in English on purpose: the reader is an agent, and the code is code.
// The UI shows its own translated titles (dictionaries) for people.

import type { DetectedStack } from "./html";
import { CHECK_WEIGHTS } from "./checks";
import { CHECK_IDS, type CheckId } from "./types";

export const FIX_STACKS = ["next-app", "generic"] as const;
export type FixStack = (typeof FIX_STACKS)[number];

export type FixFile = { path: string; action: "create" | "edit"; language: string; code: string };
export type FixRecipe = { instructions: string[]; files: FixFile[] };
export type FixEffort = "S" | "M" | "L";

export type FixDefinition = {
  id: CheckId;
  title: string;
  /** Why an agent-facing site needs this, in one or two sentences. */
  why: string;
  effort: FixEffort;
  recipes: Record<FixStack, FixRecipe>;
  /** How to prove it works. `command` is safe to run as is. */
  acceptance: { description: string; command: string };
};

export type Fix = Omit<FixDefinition, "recipes"> & { stack: FixStack; points: number; instructions: string[]; files: FixFile[] };

export function fixStackFor(stack: DetectedStack | FixStack): FixStack {
  return stack === "next-app" ? "next-app" : "generic";
}

const O = "{{ORIGIN}}";

const NEXT_NOTE = "Next.js 16 names the request interceptor `proxy.ts` (export `proxy`); on Next.js 15 and earlier the same code goes in `middleware.ts` (export `middleware`).";

const DEFS: FixDefinition[] = [
  {
    id: "content.text",
    title: "Render the page's text on the server",
    why: "Most agents fetch HTML and do not run JavaScript. If the text only exists after hydration, they read an empty shell.",
    effort: "L",
    recipes: {
      "next-app": {
        instructions: [
          "Find the route for this URL under `app/`. If the page or a parent layout starts with `\"use client\"` and fetches its content in `useEffect`, move the data loading into a Server Component (an `async` page) and pass the result down as props.",
          "Keep `\"use client\"` only on the leaves that need interactivity (forms, menus, charts).",
          "Do not wrap the main content in `dynamic(() => import(...), { ssr: false })`.",
        ],
        files: [
          {
            path: "app/EXAMPLE/page.tsx",
            action: "edit",
            language: "tsx",
            code: `// Server Component: the HTML that leaves the server already has the text.
export default async function Page() {
  const data = await loadContent(); // was: useEffect + fetch in a client component
  return (
    <main>
      <h1>{data.title}</h1>
      <p>{data.summary}</p>
      <InteractivePart initial={data} /> {/* "use client" stays here only */}
    </main>
  );
}`,
          },
        ],
      },
      generic: {
        instructions: [
          "Serve the main content in the initial HTML response: server-side rendering, static generation or prerendering, depending on the framework.",
          "A client-only single-page app needs a prerender step (for example the framework's SSG/SSR mode) for every public route.",
          "At minimum, the title, the main heading and the body copy must be present in `curl` output.",
        ],
        files: [],
      },
    },
    acceptance: {
      description: "The raw HTML contains at least 200 words of visible text.",
      command: `curl -sL ${O} | sed -e 's/<script[^>]*>.*<\\/script>//g' -e 's/<[^>]*>/ /g' | wc -w`,
    },
  },
  {
    id: "content.semantics",
    title: "Give the page a semantic outline",
    why: "Agents use headings and landmarks to find the part of the page that answers the question. One h1, ordered headings, a <main> and a lang attribute make the page cheap to parse.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: [
          "Set `lang` on `<html>` in the root layout.",
          "Wrap the page's primary content in exactly one `<main>`.",
          "Use exactly one `<h1>` per page and `<h2>`/`<h3>` for sections, in order. Replace styled `<div>` titles with real headings.",
          "Give every meaningful `<img>` (or `next/image`) an `alt`; decorative images get `alt=\"\"`.",
        ],
        files: [
          {
            path: "app/layout.tsx",
            action: "edit",
            language: "tsx",
            code: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">{/* the language the page is written in */}
      <body>
        <header>{/* site navigation */}</header>
        <main>{children}</main>
        <footer>{/* … */}</footer>
      </body>
    </html>
  );
}`,
          },
        ],
      },
      generic: {
        instructions: [
          "Add `lang` to `<html>`.",
          "Use one `<h1>`, then `<h2>`/`<h3>` in order; no skipped levels used for styling.",
          "Wrap the primary content in a single `<main>`; use `<header>`, `<nav>` and `<footer>` for the rest.",
          "Add `alt` text to meaningful images.",
        ],
        files: [],
      },
    },
    acceptance: {
      description: "Exactly one <h1>, a <main>, and <html lang> in the raw HTML.",
      command: `curl -sL ${O} | grep -o -i -E '<h1[ >]|<main[ >]|<html[^>]* lang=' | sort | uniq -c`,
    },
  },
  {
    id: "content.meta",
    title: "Add title, description and canonical",
    why: "The title and description are what an agent shows or quotes when it lists the page; the canonical tells it which URL to cite.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Export `metadata` (or `generateMetadata`) from the page or layout. Set `metadataBase` once in the root layout so relative canonicals resolve.", "Remove any `robots: { index: false }` that should not be in production."],
        files: [
          {
            path: "app/layout.tsx",
            action: "edit",
            language: "ts",
            code: `import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("${O}"),
  title: { default: "SITE_NAME", template: "%s · SITE_NAME" },
  description: "ONE_SENTENCE_DESCRIPTION_OF_THE_SITE",
  alternates: { canonical: "/" },
};`,
          },
        ],
      },
      generic: {
        instructions: ["Add the three tags to `<head>` on every page, with page-specific values.", "Remove `<meta name=\"robots\" content=\"noindex\">` from pages that should be found."],
        files: [
          {
            path: "<head> of every page",
            action: "edit",
            language: "html",
            code: `<title>PAGE_TITLE · SITE_NAME</title>
<meta name="description" content="ONE_SENTENCE_DESCRIPTION_OF_THIS_PAGE">
<link rel="canonical" href="${O}/PAGE_PATH">`,
          },
        ],
      },
    },
    acceptance: { description: "All three tags are present in the raw HTML.", command: `curl -sL ${O} | grep -o -i -E '<title>|name="description"|rel="canonical"'` },
  },
  {
    id: "content.weight",
    title: "Put the HTML on a diet",
    why: "Every byte of HTML is paid for in tokens by the agent that reads it. Large inlined state, base64 images and repeated markup crowd the content out of its context window.",
    effort: "M",
    recipes: {
      "next-app": {
        instructions: [
          "Look for large props passed from Server to Client Components: they are serialized into the HTML. Pass only the fields the client uses.",
          "Move inlined SVG sprites and base64 images to files.",
          "Paginate or lazy-load long lists instead of rendering everything.",
          "Serving markdown to agents (fixes `markdown.negotiation` / `markdown.twin`) sidesteps the problem for them entirely.",
        ],
        files: [],
      },
      generic: {
        instructions: ["Remove inlined JSON state, base64 assets and duplicated navigation markup from the HTML.", "Aim for under 250 KB of HTML per page.", "Offer a markdown version of the page for agents."],
        files: [],
      },
    },
    acceptance: { description: "The HTML response is under 250,000 bytes.", command: `curl -sL ${O} | wc -c` },
  },
  {
    id: "markdown.negotiation",
    title: "Answer `Accept: text/markdown` with markdown",
    why: "Coding agents and several AI crawlers ask for markdown first. Markdown costs them a fraction of the tokens of HTML and carries no layout noise.",
    effort: "M",
    recipes: {
      "next-app": {
        instructions: [
          "Requires the markdown twin route from fix `markdown.twin` (`app/md/[[...path]]/route.ts`).",
          "In the request interceptor, rewrite a page request to its twin when the client prefers `text/markdown`. Browsers never send it, so HTML stays the default.",
          NEXT_NOTE,
        ],
        files: [
          {
            path: "proxy.ts",
            action: "edit",
            language: "ts",
            code: `import { NextResponse, type NextRequest } from "next/server";

function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const q = (type: string) => {
    for (const part of accept.split(",")) {
      const [name, ...params] = part.trim().split(";");
      if (name.trim().toLowerCase() !== type) continue;
      const m = params.map((p) => /^\\s*q=([0-9.]+)/.exec(p)).find(Boolean);
      return m ? Number(m[1]) : 1;
    }
    return 0;
  };
  return q("text/markdown") > 0 && q("text/markdown") >= q("text/html");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (prefersMarkdown(request.headers.get("accept"))) {
    const res = NextResponse.rewrite(new URL(\`/md\${pathname === "/" ? "" : pathname}\`, request.url));
    res.headers.append("Vary", "Accept");
    return res;
  }
  return NextResponse.next();
}

// Pages only: skip API routes, Next internals and files with an extension.
export const config = { matcher: ["/((?!api|_next|md|.*\\\\..*).*)"] };`,
          },
        ],
      },
      generic: {
        instructions: [
          "At the edge or in the server, when a page request's `Accept` header lists `text/markdown` with a q-value at least as high as `text/html`, respond with the page's markdown version.",
          "Send `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`.",
          "On Cloudflare this is a zone setting (\"Markdown for Agents\") and needs no code.",
        ],
        files: [],
      },
    },
    acceptance: { description: "The response Content-Type is text/markdown.", command: `curl -sI -H "Accept: text/markdown" ${O} | grep -i "^content-type"` },
  },
  {
    id: "markdown.twin",
    title: "Publish a markdown twin for each page",
    why: "A stable `.md` URL per page gives agents a clean document to fetch and gives llms.txt something worth linking to.",
    effort: "M",
    recipes: {
      "next-app": {
        instructions: [
          "Add a route that returns markdown generated from the same data the HTML page renders (never a second, hand-written copy that can drift).",
          "Rewrite `/<path>.md` to that route in `next.config`.",
          "Return 404 for paths that have no twin.",
        ],
        files: [
          {
            path: "app/md/[[...path]]/route.ts",
            action: "create",
            language: "ts",
            code: `import { getPageContent } from "@/lib/content"; // the same loader the HTML page uses

export async function GET(_req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const page = await getPageContent(path);
  if (!page) return new Response("Not found\\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  const url = \`${O}/\${path.join("/")}\`;
  const body = [\`# \${page.title}\`, "", \`> \${page.description}\`, "", \`Source: \${url}\`, "", page.markdown].join("\\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Link: \`<\${url}>; rel="canonical"\`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}`,
          },
          {
            path: "next.config.ts",
            action: "edit",
            language: "ts",
            code: `async rewrites() {
  return {
    beforeFiles: [
      { source: "/index.md", destination: "/md" },
      { source: "/:path*.md", destination: "/md/:path*" },
    ],
  };
},`,
          },
        ],
      },
      generic: {
        instructions: [
          "For each public page, generate a markdown file from the same source as the HTML and serve it at the page URL plus `.md` (the home page at `/index.md`).",
          "Serve it as `text/markdown; charset=utf-8` with a `Link: <html-url>; rel=\"canonical\"` header.",
          "Static site generators can emit the source markdown next to the HTML at build time.",
        ],
        files: [],
      },
    },
    acceptance: { description: "The twin answers 200 as text/markdown.", command: `curl -sI ${O}/index.md | grep -i -E "^(HTTP|content-type)"` },
  },
  {
    id: "markdown.alternate",
    title: "Announce the markdown version",
    why: "An agent that lands on the HTML needs to be told the markdown exists: a <link rel=\"alternate\"> in the head, a Link header, or both.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Add the alternate to each page's metadata. Do this only for pages whose twin actually exists."],
        files: [
          {
            path: "app/EXAMPLE/page.tsx",
            action: "edit",
            language: "ts",
            code: `export const metadata = {
  alternates: {
    canonical: "/EXAMPLE",
    types: { "text/markdown": "/EXAMPLE.md" },
  },
};`,
          },
        ],
      },
      generic: {
        instructions: ["Add the tag to the `<head>` of every page that has a markdown version."],
        files: [{ path: "<head> of every page", action: "edit", language: "html", code: `<link rel="alternate" type="text/markdown" href="${O}/PAGE_PATH.md">` }],
      },
    },
    acceptance: { description: "The HTML announces a text/markdown alternate.", command: `curl -sL ${O} | grep -o -i '<link[^>]*text/markdown[^>]*>'` },
  },
  {
    id: "structured.jsonld",
    title: "Embed valid JSON-LD",
    why: "Structured data is the one machine-readable layer every major AI system already parses. It states facts (who, what, price, date) without the agent having to infer them from prose.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: [
          "Render one `<script type=\"application/ld+json\">` per page from a plain object. Build it from the same data the page shows, so it can never disagree with the visible text.",
          "Escape `<` so user-supplied strings cannot close the script tag.",
          "If the audit reported invalid blocks, fix their JSON first (trailing commas and unescaped quotes are the usual cause).",
        ],
        files: [
          {
            path: "components/JsonLd.tsx",
            action: "create",
            language: "tsx",
            code: `export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\\\u003c") }} />;
}`,
          },
          {
            path: "app/layout.tsx",
            action: "edit",
            language: "tsx",
            code: `<JsonLd
  data={{
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "${O}/#org", name: "SITE_NAME", url: "${O}" },
      { "@type": "WebSite", "@id": "${O}/#website", url: "${O}", name: "SITE_NAME", publisher: { "@id": "${O}/#org" } },
    ],
  }}
/>`,
          },
        ],
      },
      generic: {
        instructions: ["Add a JSON-LD block to the page. Validate it with a JSON parser before shipping."],
        files: [
          {
            path: "<head> or <body> of the page",
            action: "edit",
            language: "html",
            code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "${O}/#org", "name": "SITE_NAME", "url": "${O}" },
    { "@type": "WebSite", "@id": "${O}/#website", "url": "${O}", "name": "SITE_NAME", "publisher": { "@id": "${O}/#org" } }
  ]
}
</script>`,
          },
        ],
      },
    },
    acceptance: { description: "At least one application/ld+json block that parses as JSON.", command: `curl -sL ${O} | grep -c 'application/ld+json'` },
  },
  {
    id: "structured.types",
    title: "Describe the page with the right schema.org types",
    why: "Generic markup says little. The type that matches the page (Article, Product, FAQPage, SoftwareApplication…) is what lets an agent answer a specific question from it.",
    effort: "M",
    recipes: {
      "next-app": {
        instructions: [
          "Site-wide: `Organization` and `WebSite` in the root layout.",
          "Per page, add the node that matches its content: `Article`/`BlogPosting` (headline, datePublished, author), `Product` + `Offer` (name, price, priceCurrency, availability), `FAQPage` (only for questions visible on the page), `SoftwareApplication`, `LocalBusiness`, `BreadcrumbList`.",
          "Only state what the page visibly says.",
        ],
        files: [
          {
            path: "app/blog/[slug]/page.tsx",
            action: "edit",
            language: "tsx",
            code: `<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author },
    mainEntityOfPage: \`${O}/blog/\${post.slug}\`,
  }}
/>`,
          },
        ],
      },
      generic: {
        instructions: [
          "Add `Organization` and `WebSite` on every page, and one content type per page: `Article`, `Product` + `Offer`, `FAQPage`, `SoftwareApplication`, `LocalBusiness` or `BreadcrumbList`.",
          "Fill the properties an agent would be asked about (dates, prices, authors, addresses). Only state what the page visibly says.",
        ],
        files: [],
      },
    },
    acceptance: { description: "At least two recognized schema.org types on the page.", command: `curl -sL ${O} | grep -o '"@type": *"[A-Za-z]*"' | sort -u` },
  },
  {
    id: "structured.social",
    title: "Add Open Graph tags",
    why: "Open Graph is the fallback metadata many agents and link unfurlers read when there is no JSON-LD: title, description and image in three tags.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Add `openGraph` to the metadata. An `app/opengraph-image.tsx` (or a static `opengraph-image.png`) provides the image."],
        files: [
          {
            path: "app/layout.tsx",
            action: "edit",
            language: "ts",
            code: `export const metadata: Metadata = {
  // …
  openGraph: { type: "website", url: "/", siteName: "SITE_NAME", title: "SITE_NAME", description: "ONE_SENTENCE_DESCRIPTION_OF_THE_SITE" },
  twitter: { card: "summary_large_image" },
};`,
          },
        ],
      },
      generic: {
        instructions: ["Add the tags to `<head>`; the image must be an absolute URL."],
        files: [
          {
            path: "<head> of every page",
            action: "edit",
            language: "html",
            code: `<meta property="og:type" content="website">
<meta property="og:title" content="PAGE_TITLE">
<meta property="og:description" content="ONE_SENTENCE_DESCRIPTION_OF_THIS_PAGE">
<meta property="og:image" content="${O}/og.png">
<meta name="twitter:card" content="summary_large_image">`,
          },
        ],
      },
    },
    acceptance: { description: "og:title, og:description and og:image are present.", command: `curl -sL ${O} | grep -o -E 'og:(title|description|image)' | sort -u` },
  },
  {
    id: "api.catalog",
    title: "Publish an API catalog",
    why: "`/.well-known/api-catalog` (RFC 9727) is where an agent looks to learn that a site has an API and where its description lives, without guessing URLs.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["List only the endpoints you want third parties to call. If the site has no public API yet, do this together with fix `api.openapi` once one exists."],
        files: [
          {
            path: "app/.well-known/api-catalog/route.ts",
            action: "create",
            language: "ts",
            code: `export const dynamic = "force-static";

export function GET() {
  const linkset = [
    {
      anchor: "${O}/api",
      "service-desc": [{ href: "${O}/openapi.json", type: "application/openapi+json" }],
      "service-doc": [{ href: "${O}/docs/api", type: "text/html" }],
    },
  ];
  return new Response(JSON.stringify({ linkset }, null, 2), {
    headers: {
      "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}`,
          },
        ],
      },
      generic: {
        instructions: ["Serve this JSON at `/.well-known/api-catalog` with `Content-Type: application/linkset+json`."],
        files: [
          {
            path: ".well-known/api-catalog",
            action: "create",
            language: "json",
            code: `{
  "linkset": [
    {
      "anchor": "${O}/api",
      "service-desc": [{ "href": "${O}/openapi.json", "type": "application/openapi+json" }],
      "service-doc": [{ "href": "${O}/docs/api", "type": "text/html" }]
    }
  ]
}`,
          },
        ],
      },
    },
    acceptance: { description: "The catalog answers 200 with a linkset array.", command: `curl -s ${O}/.well-known/api-catalog` },
  },
  {
    id: "api.openapi",
    title: "Describe the API with OpenAPI",
    why: "An OpenAPI document lets an agent call the API correctly on the first try: paths, parameters and response shapes, instead of reading prose docs.",
    effort: "M",
    recipes: {
      "next-app": {
        instructions: [
          "Write an OpenAPI 3.1 document for the public, read-only endpoints first. Generate it from the route schemas (zod) if the project has them, so it cannot drift.",
          "Serve it at `/openapi.json` and reference it from the API catalog (`service-desc`).",
        ],
        files: [
          {
            path: "app/openapi.json/route.ts",
            action: "create",
            language: "ts",
            code: `export const dynamic = "force-static";

export function GET() {
  const doc = {
    openapi: "3.1.0",
    info: { title: "SITE_NAME API", version: "1.0.0" },
    servers: [{ url: "${O}" }],
    paths: {
      "/api/EXAMPLE": {
        get: {
          operationId: "listExample",
          summary: "WHAT_IT_RETURNS",
          responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
    },
  };
  return Response.json(doc, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } });
}`,
          },
        ],
      },
      generic: {
        instructions: ["Publish an OpenAPI 3.1 document at `/openapi.json` covering the public endpoints, and link it from `/.well-known/api-catalog` as `service-desc`."],
        files: [],
      },
    },
    acceptance: { description: "/openapi.json answers 200 and has `openapi` and `paths`.", command: `curl -s ${O}/openapi.json | head -c 300` },
  },
  {
    id: "api.mcp",
    title: "Expose an MCP server and make it discoverable",
    why: "MCP is how agents use a product instead of only reading about it: search, look up, act. A discovery document lets them find the server from the domain alone.",
    effort: "L",
    recipes: {
      "next-app": {
        instructions: [
          "Install: `npm install mcp-handler@^2 @modelcontextprotocol/server@^2 zod@^4`.",
          "Start with read-only tools that wrap what the site already does (search content, get an item, list categories). Validate every input with zod.",
          "Publish a Server Card next to the endpoint (`<mcp-url>/server-card`) and an AI Catalog at `/.well-known/ard.json` (and at `/.well-known/ai-catalog.json`, its predecessor path) pointing at the card.",
          "Check the current `mcp-handler` README for the exact API before writing the route: it changed between major versions.",
          "Both formats are young: confirm them against github.com/modelcontextprotocol/experimental-ext-server-card and github.com/ards-project/ard-spec before shipping.",
        ],
        files: [
          {
            path: "app/api/mcp/route.ts",
            action: "create",
            language: "ts",
            code: `import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search",
      { title: "Search the site", description: "Full-text search over the public content.", inputSchema: z.object({ query: z.string().min(2).max(200) }) },
      async ({ query }) => ({ content: [{ type: "text", text: JSON.stringify(await searchSite(query)) }] }),
    );
  },
  { serverInfo: { name: "SITE_NAME", version: "1.0.0" } },
);

export { handler as GET, handler as POST };`,
          },
          {
            path: "app/api/mcp/server-card/route.ts",
            action: "create",
            language: "ts",
            code: `export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
      name: "REVERSE.DOMAIN/SERVER_NAME", // e.g. com.example/search — exactly one slash
      version: "1.0.0",
      description: "WHAT_THE_SERVER_DOES (100 characters at most)",
      remotes: [{ type: "streamable-http", url: "{{ORIGIN}}/api/mcp" }],
    },
    {
      headers: {
        "Content-Type": "application/mcp-server-card+json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
        "Access-Control-Expose-Headers": "ETag",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}`,
          },
          {
            path: "app/.well-known/ard.json/route.ts",
            action: "create",
            language: "ts",
            code: `// Serve the same document at app/.well-known/ai-catalog.json/route.ts (the predecessor path, still widely read).
export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify({
      specVersion: "1.0",
      host: { displayName: "SITE_NAME" },
      entries: [
        {
          identifier: "urn:air:SITE_DOMAIN:mcp/SERVER_NAME",
          displayName: "SITE_NAME MCP server",
          type: "application/mcp-server-card+json",
          url: "{{ORIGIN}}/api/mcp/server-card",
          representativeQueries: ["A_QUESTION_THIS_SERVER_ANSWERS", "ANOTHER_ONE"], // 2 to 5
        },
      ],
    }),
    { headers: { "Content-Type": "application/ai-catalog+json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}`,
          },
        ],
      },
      generic: {
        instructions: [
          "Build a remote MCP server (Streamable HTTP) with read-only tools for the site's main actions, using the official SDK for your language.",
          "Publish an MCP Server Card at `<mcp-url>/server-card` (`application/mcp-server-card+json`: `$schema`, `name`, `version`, `description`, `remotes`).",
          "Publish an AI Catalog at `/.well-known/ard.json` and `/.well-known/ai-catalog.json` (`specVersion: \"1.0\"`, `entries[]` with `identifier`, `displayName`, `type: \"application/mcp-server-card+json\"` and `url` pointing at the card).",
        ],
        files: [],
      },
    },
    acceptance: { description: "The AI catalog lists an entry of type application/mcp-server-card+json.", command: `curl -s ${O}/.well-known/ard.json` },
  },
  {
    id: "api.webmcp",
    title: "Expose page actions with WebMCP",
    why: "WebMCP lets a browser agent call the page's own actions as tools instead of clicking through the UI. It is an early Chrome proposal: low cost on forms, low priority overall.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Annotate the main form declaratively. The attributes are ignored by browsers without WebMCP.", "React passes unknown lowercase attributes through; TypeScript needs them declared or spread from an object."],
        files: [
          {
            path: "components/SearchForm.tsx",
            action: "edit",
            language: "tsx",
            code: `const tool = { toolname: "search_site", tooldescription: "Search the site's content" };
const param = { toolparamdescription: "What to look for" };

export default function SearchForm() {
  return (
    <form action="/search" {...tool}>
      <input name="q" type="search" required {...param} />
      <button type="submit">Search</button>
    </form>
  );
}`,
          },
        ],
      },
      generic: {
        instructions: ["Add `toolname` and `tooldescription` to the page's main `<form>`, and `toolparamdescription` to its inputs."],
        files: [
          {
            path: "the page's main form",
            action: "edit",
            language: "html",
            code: `<form action="/search" toolname="search_site" tooldescription="Search the site's content">
  <input name="q" type="search" required toolparamdescription="What to look for">
  <button type="submit">Search</button>
</form>`,
          },
        ],
      },
    },
    acceptance: { description: "A form in the raw HTML carries a toolname attribute.", command: `curl -sL ${O} | grep -o -i '<form[^>]*toolname[^>]*>'` },
  },
  {
    id: "api.skills",
    title: "Publish an agent skills index",
    why: "A skills index tells coding agents how to work with the product: packaged instructions they can load on demand. Worth it only if there is a skill to publish.",
    effort: "M",
    recipes: {
      "next-app": {
        instructions: [
          "Write the skill as a `SKILL.md` (name, description, when to use it, steps) and put it under `public/.well-known/agent-skills/`.",
          "Publish the index next to it. `digest` is the SHA-256 of the skill file; recompute it whenever the file changes.",
          "Take the exact `$schema` URL and the allowed `type` values from the Agent Skills Discovery spec (github.com/cloudflare/agent-skills-discovery-rfc) before writing the file: the format is still a draft.",
        ],
        files: [
          {
            path: "public/.well-known/agent-skills/index.json",
            action: "create",
            language: "json",
            code: `{
  "$schema": "SCHEMA_URL_FROM_THE_SPEC",
  "skills": [
    {
      "name": "use-SITE_NAME",
      "type": "TYPE_FROM_THE_SPEC",
      "description": "WHEN_AN_AGENT_SHOULD_USE_THIS_SKILL",
      "url": "${O}/.well-known/agent-skills/use-SITE_NAME/SKILL.md",
      "digest": "sha256:REPLACE_WITH_THE_FILE_DIGEST"
    }
  ]
}`,
          },
        ],
      },
      generic: {
        instructions: ["Serve a `SKILL.md` and an index at `/.well-known/agent-skills/index.json` listing its name, type, description, url and SHA-256 digest."],
        files: [],
      },
    },
    acceptance: { description: "The index answers 200 with a non-empty skills array.", command: `curl -s ${O}/.well-known/agent-skills/index.json` },
  },
  {
    id: "bots.robots",
    title: "Serve a valid robots.txt",
    why: "robots.txt is the first file every well-behaved crawler and agent reads. Without it there is no place to state rules, signals or the sitemap.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Add `app/robots.ts`. If the site answers every unknown path with its HTML shell, this also stops `/robots.txt` from returning a web page."],
        files: [
          {
            path: "app/robots.ts",
            action: "create",
            language: "ts",
            code: `import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/_next/"] }],
    sitemap: "${O}/sitemap.xml",
  };
}`,
          },
        ],
      },
      generic: {
        instructions: ["Serve this file at `/robots.txt` as `text/plain`."],
        files: [{ path: "robots.txt", action: "create", language: "text", code: `User-agent: *\nAllow: /\n\nSitemap: ${O}/sitemap.xml` }],
      },
    },
    acceptance: { description: "robots.txt answers 200 as text/plain with a User-agent line.", command: `curl -s ${O}/robots.txt | head -5` },
  },
  {
    id: "bots.ai-rules",
    title: "State explicit rules for AI agents",
    why: "AI systems send three kinds of bots: fetchers that act for a person, search indexers and training crawlers. Blocking the first kind makes the site unreadable to assistants; naming each one makes the policy a decision instead of an accident.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: [
          "Decide per kind. Recommended baseline: allow user fetchers and search indexers; allow or refuse training crawlers according to the owner's policy (ask them; do not decide this yourself).",
          "A bot with its own group ignores the `*` group, so repeat the shared `disallow` list in each one.",
        ],
        files: [
          {
            path: "app/robots.ts",
            action: "edit",
            language: "ts",
            code: `import type { MetadataRoute } from "next";

const disallow = ["/api/", "/_next/"];
const USER = ["ChatGPT-User", "Claude-User", "Perplexity-User", "MistralAI-User"];
const SEARCH = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];
const TRAINING = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent"];
const ALLOW_TRAINING = true; // the owner's call

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...[...USER, ...SEARCH].map((userAgent) => ({ userAgent, allow: "/", disallow })),
      ...TRAINING.map((userAgent) => (ALLOW_TRAINING ? { userAgent, allow: "/", disallow } : { userAgent, disallow: "/" })),
    ],
    sitemap: "${O}/sitemap.xml",
  };
}`,
          },
        ],
      },
      generic: {
        instructions: [
          "Add one group per AI bot to robots.txt. Never `Disallow: /` the user fetchers (ChatGPT-User, Claude-User, Perplexity-User) unless the owner wants assistants locked out.",
          "Whether training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot…) are allowed is the owner's decision.",
        ],
        files: [
          {
            path: "robots.txt",
            action: "edit",
            language: "text",
            code: `User-agent: ChatGPT-User\nAllow: /\n\nUser-agent: Claude-User\nAllow: /\n\nUser-agent: Perplexity-User\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /`,
          },
        ],
      },
    },
    acceptance: { description: "robots.txt names the AI user agents and does not block the user fetchers.", command: `curl -s ${O}/robots.txt | grep -i -A2 -E "ChatGPT-User|Claude-User|Perplexity-User"` },
  },
  {
    id: "bots.signals",
    title: "Declare Content Signals",
    why: "Content Signals say what fetched content may be used for (search, answering a user, training), separately from who may fetch it. It is the one place to state that preference in a machine-readable way.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: [
          "`MetadataRoute.Robots` cannot emit the `Content-Signal` line, so serve robots.txt from a route handler instead of `app/robots.ts` (delete that file: the two conflict).",
          "The three values are the owner's policy. Ask before choosing `ai-train`.",
        ],
        files: [
          {
            path: "app/robots.txt/route.ts",
            action: "create",
            language: "ts",
            code: `export const dynamic = "force-static";

const SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=no"; // the owner's policy

export function GET() {
  const body = ["User-agent: *", SIGNAL, "Allow: /", "Disallow: /api/", "", "Sitemap: ${O}/sitemap.xml", ""].join("\\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}`,
          },
        ],
      },
      generic: {
        instructions: ["Add a `Content-Signal` line inside each `User-agent` group of robots.txt. The values are the owner's policy."],
        files: [{ path: "robots.txt", action: "edit", language: "text", code: `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /` }],
      },
    },
    acceptance: { description: "robots.txt has a Content-Signal line.", command: `curl -s ${O}/robots.txt | grep -i "content-signal"` },
  },
  {
    id: "discovery.sitemap",
    title: "Publish a sitemap",
    why: "A sitemap is the complete list of what the site wants read. Agents and crawlers use it instead of guessing URLs from links.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Add `app/sitemap.ts` listing every public route (static ones and those from the CMS or database), and reference it from robots.txt."],
        files: [
          {
            path: "app/sitemap.ts",
            action: "create",
            language: "ts",
            code: `import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/about", "/pricing"]; // plus the dynamic ones, loaded here
  return pages.map((path) => ({ url: \`${O}\${path}\`, lastModified: new Date(), changeFrequency: "weekly" }));
}`,
          },
        ],
      },
      generic: {
        instructions: ["Generate `/sitemap.xml` with one `<url><loc>` per public page (most frameworks and CMSs have a plugin).", "Add `Sitemap: " + O + "/sitemap.xml` to robots.txt."],
        files: [],
      },
    },
    acceptance: { description: "sitemap.xml answers 200 with a <urlset> or <sitemapindex>.", command: `curl -s ${O}/sitemap.xml | head -c 300` },
  },
  {
    id: "discovery.links",
    title: "Send discovery Link headers",
    why: "A `Link` header (RFC 8288) tells an agent where the machine-readable resources are before it parses a single byte of HTML.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: ["Add the header in `next.config`. List only resources that exist: remove the lines for anything the site does not serve."],
        files: [
          {
            path: "next.config.ts",
            action: "edit",
            language: "ts",
            code: `async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "Link",
          value: [
            '</sitemap.xml>; rel="sitemap"',
            '</llms.txt>; rel="describedby"; type="text/plain"',
            '</.well-known/api-catalog>; rel="api-catalog"',
          ].join(", "),
        },
      ],
    },
  ];
},`,
          },
        ],
      },
      generic: {
        instructions: ["Add a `Link` response header to HTML pages, listing only resources that exist."],
        files: [
          {
            path: "server or CDN configuration",
            action: "edit",
            language: "http",
            code: `Link: </sitemap.xml>; rel="sitemap", </llms.txt>; rel="describedby"; type="text/plain", </.well-known/api-catalog>; rel="api-catalog"`,
          },
        ],
      },
    },
    acceptance: { description: "The page response carries a Link header.", command: `curl -sI ${O} | grep -i "^link:"` },
  },
  {
    id: "discovery.llms",
    title: "Add an llms.txt",
    why: "llms.txt is a short markdown index of the pages worth reading. Evidence that agents fetch it on their own is still thin, so it is worth 3 points here; it is cheap, and coding agents do use it when pointed at it.",
    effort: "S",
    recipes: {
      "next-app": {
        instructions: [
          "Generate it from the same list the sitemap uses, so it never goes stale.",
          "Link the markdown twins (`.md`) when they exist; otherwise the HTML pages.",
          "Keep it short: a title, one summary paragraph, then sections of links with a one-line description each.",
        ],
        files: [
          {
            path: "app/llms.txt/route.ts",
            action: "create",
            language: "ts",
            code: `export const dynamic = "force-static";

const PAGES = [
  { title: "About", path: "/about", description: "WHO_IS_BEHIND_THE_SITE" },
  { title: "Pricing", path: "/pricing", description: "PLANS_AND_PRICES" },
];

export function GET() {
  const body = [
    "# SITE_NAME",
    "",
    "> ONE_PARAGRAPH: what the site is, who it is for, what it offers.",
    "",
    "## Pages",
    "",
    ...PAGES.map((p) => \`- [\${p.title}](${O}\${p.path}): \${p.description}\`),
    "",
  ].join("\\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}`,
          },
        ],
      },
      generic: {
        instructions: ["Serve a markdown file at `/llms.txt` as `text/plain`: an `# H1` with the site name, a `>` summary, then `##` sections of links with a one-line description each."],
        files: [{ path: "llms.txt", action: "create", language: "markdown", code: `# SITE_NAME\n\n> ONE_PARAGRAPH: what the site is, who it is for, what it offers.\n\n## Pages\n\n- [About](${O}/about): WHO_IS_BEHIND_THE_SITE\n- [Pricing](${O}/pricing): PLANS_AND_PRICES` }],
      },
    },
    acceptance: { description: "llms.txt answers 200, starts with a `# ` heading and has links.", command: `curl -s ${O}/llms.txt | head -12` },
  },
];

export const FIX_DEFINITIONS: Readonly<Record<CheckId, FixDefinition>> = Object.fromEntries(DEFS.map((d) => [d.id, d])) as Record<CheckId, FixDefinition>;

/** Accepts only an origin we produced ourselves: scheme + host, no path, no credentials. */
export function isSafeOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (u.protocol === "https:" || u.protocol === "http:") && u.origin === origin && !u.username && !u.password && /^[a-z0-9.:[\]-]+$/i.test(u.host);
  } catch {
    return false;
  }
}

const fill = (s: string, origin: string) => s.split(O).join(origin);

/** The fix for a check, with the site's origin filled in. `origin` must come from an Audit. */
export function getFix(id: CheckId, stack: DetectedStack | FixStack, origin: string): Fix {
  const def = FIX_DEFINITIONS[id];
  const fixStack = fixStackFor(stack);
  const safe = isSafeOrigin(origin) ? origin : "https://YOUR_DOMAIN";
  const recipe = def.recipes[fixStack];
  return {
    id: def.id,
    title: def.title,
    why: def.why,
    effort: def.effort,
    stack: fixStack,
    points: CHECK_WEIGHTS[id],
    instructions: recipe.instructions.map((s) => fill(s, safe)),
    files: recipe.files.map((f) => ({ ...f, path: fill(f.path, safe), code: fill(f.code, safe) })),
    acceptance: { description: def.acceptance.description, command: fill(def.acceptance.command, safe) },
  };
}

export const ALL_FIX_IDS: readonly CheckId[] = CHECK_IDS;
