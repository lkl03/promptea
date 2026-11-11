// lib/blog/sources.ts
//
// v1.8.3 — THE CURATED SOURCE REGISTRY of AI Daily (AI and Tech editions).
//
// What it is: the list of places the editorial routines read, each with the
// feed or changelog URL, what kind of source it is, its tier, its language, its
// topics and the rule for using it. It feeds three things:
//   - the public page /{lang}/sources ("How we choose and verify sources");
//   - docs/editorial/sources.md and the routine prompt
//     (docs/editorial/tech-daily-routine.md), which tell the routine where to look;
//   - scripts/editorial/verify-sources.mjs, which fetches every URL and writes
//     docs/editorial/sources-verification.md.
//
// What it is NOT: a whitelist enforced by the publish endpoint. A story may cite
// a primary source that is not here (a company that has never been covered
// before); the rules that ARE enforced live in lib/blog/types.ts (at least one
// primary source, a second source or a stated justification, https only).
//
// Rules of the registry itself (test-enforced, lib/__tests__/blog.sources.test.ts):
//   - every URL is https and was fetched successfully on `verifiedAt` — an entry
//     that cannot be verified is not added (403/404 at verification time: left out);
//   - ids are unique kebab-case; every tier has entries; Tier 1 never has the
//     `reporting` type and Tier 2 always has it.
//
// To add a source: add the entry, run `node scripts/editorial/verify-sources.mjs`,
// and commit the regenerated docs/editorial/sources-verification.md.

import type { BlogSourceType, ContentLang } from "@/lib/domain";

/**
 * 1 — primary: the party that did the thing says so itself (its blog, changelog,
 *     release notes, documentation, repository, paper, filing).
 * 2 — trusted technical press: independent reporting, used to add context or
 *     independent confirmation, never as the only basis of a claim.
 * 3 — discovery only: where a story is noticed. Never cited, never a basis.
 */
export const SOURCE_TIERS = [1, 2, 3] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const SOURCE_FORMATS = ["rss", "atom", "html", "json"] as const;
export type SourceFormat = (typeof SOURCE_FORMATS)[number];

export const SOURCE_TOPICS = [
  "ai-labs", // model makers and their research
  "ai-apis", // API changelogs and release notes of model providers
  "cloud", // cloud and hosting platforms
  "data", // databases and data platforms
  "web-platform", // browsers and web standards
  "frameworks", // web/app frameworks and UI libraries
  "runtimes", // language runtimes and languages
  "developer-tools", // tooling, CI, containers, code hosting
  "hardware", // chips, accelerators, devices
  "research", // papers
  "security", // advisories and security reporting
  "policy", // standards bodies and regulators
  "press", // general technology reporting
  "discovery", // aggregators and trending lists
] as const;
export type SourceTopic = (typeof SOURCE_TOPICS)[number];

export type EditorialSource = {
  /** Stable kebab-case id. */
  id: string;
  /** Name of the feed or page, as a reader would call it. */
  name: string;
  /** Who publishes it (the `publisher` a citation of it would carry). */
  publisher: string;
  /** The feed, changelog or page the routine reads. Always https. */
  url: string;
  format: SourceFormat;
  tier: SourceTier;
  /** What a citation of this source is, in the article's own vocabulary (BLOG_SOURCE_TYPES). */
  sourceType: BlogSourceType;
  /** Language of the source. */
  lang: ContentLang;
  topics: readonly SourceTopic[];
  /** Which editions it serves: "ai", "tech" or both. */
  editions: readonly ("ai" | "tech")[];
  /** An extra rule for this source, on top of its tier's rules (English; internal). */
  note?: string;
  /** YYYY-MM-DD the URL last answered 200 with the expected kind of document. */
  verifiedAt: string;
};

/** The day every entry below was fetched (see docs/editorial/sources-verification.md). */
export const SOURCES_VERIFIED_AT = "2026-11-11";

const AI = ["ai"] as const;
const TECH = ["tech"] as const;
const BOTH = ["ai", "tech"] as const;

type Def = Omit<EditorialSource, "verifiedAt" | "lang"> & { lang?: ContentLang };
const src = (d: Def): EditorialSource => ({ lang: "en", ...d, verifiedAt: SOURCES_VERIFIED_AT });

export const EDITORIAL_SOURCES: readonly EditorialSource[] = [
  // ══ TIER 1 — PRIMARY ═══════════════════════════════════════════════════════

  // ── Cloud and hosting platforms ──
  src({ id: "vercel-blog", name: "Vercel Blog", publisher: "Vercel", url: "https://vercel.com/atom", format: "atom", tier: 1, sourceType: "announcement", topics: ["cloud", "frameworks", "ai-apis"], editions: TECH }),
  src({ id: "vercel-changelog", name: "Vercel Changelog", publisher: "Vercel", url: "https://vercel.com/changelog", format: "html", tier: 1, sourceType: "changelog", topics: ["cloud"], editions: TECH }),
  src({ id: "cloudflare-blog", name: "The Cloudflare Blog", publisher: "Cloudflare", url: "https://blog.cloudflare.com/rss/", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "security", "web-platform"], editions: TECH }),
  src({ id: "cloudflare-blog-ai", name: "The Cloudflare Blog — AI", publisher: "Cloudflare", url: "https://blog.cloudflare.com/tag/ai/rss/", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "ai-apis"], editions: BOTH }),
  src({ id: "cloudflare-changelog", name: "Cloudflare Developer Platform Changelog", publisher: "Cloudflare", url: "https://developers.cloudflare.com/changelog/", format: "html", tier: 1, sourceType: "changelog", topics: ["cloud"], editions: TECH, note: "The RSS version (changelog/rss/index.xml) is about 9 MB; read the page, or the feed with a size limit." }),
  src({ id: "supabase-blog", name: "Supabase Blog", publisher: "Supabase", url: "https://supabase.com/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "data"], editions: TECH }),
  src({ id: "supabase-changelog", name: "Supabase Changelog", publisher: "Supabase", url: "https://supabase.com/changelog", format: "html", tier: 1, sourceType: "changelog", topics: ["cloud", "data"], editions: TECH }),
  src({ id: "github-blog", name: "The GitHub Blog", publisher: "GitHub", url: "https://github.blog/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "ai-apis"], editions: BOTH }),
  src({ id: "github-changelog", name: "GitHub Changelog", publisher: "GitHub", url: "https://github.blog/changelog/feed/", format: "rss", tier: 1, sourceType: "changelog", topics: ["developer-tools"], editions: TECH }),
  src({ id: "netlify-blog", name: "Netlify Blog", publisher: "Netlify", url: "https://www.netlify.com/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud"], editions: TECH }),
  src({ id: "netlify-changelog", name: "Netlify Changelog", publisher: "Netlify", url: "https://www.netlify.com/changelog/", format: "html", tier: 1, sourceType: "changelog", topics: ["cloud"], editions: TECH }),
  src({ id: "aws-whats-new", name: "What's New with AWS", publisher: "Amazon Web Services", url: "https://aws.amazon.com/about-aws/whats-new/recent/feed/", format: "rss", tier: 1, sourceType: "changelog", topics: ["cloud"], editions: TECH }),
  src({ id: "aws-news-blog", name: "AWS News Blog", publisher: "Amazon Web Services", url: "https://aws.amazon.com/blogs/aws/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud"], editions: TECH }),
  src({ id: "aws-ml-blog", name: "AWS Machine Learning Blog", publisher: "Amazon Web Services", url: "https://aws.amazon.com/blogs/machine-learning/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "ai-apis"], editions: BOTH }),
  src({ id: "gcp-release-notes", name: "Google Cloud release notes", publisher: "Google Cloud", url: "https://docs.cloud.google.com/feeds/gcp-release-notes.xml", format: "atom", tier: 1, sourceType: "changelog", topics: ["cloud"], editions: TECH }),
  src({ id: "google-cloud-blog", name: "Google Cloud Blog", publisher: "Google Cloud", url: "https://cloudblog.withgoogle.com/rss/", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "ai-apis"], editions: BOTH }),
  src({ id: "azure-blog", name: "Microsoft Azure Blog", publisher: "Microsoft", url: "https://azure.microsoft.com/en-us/blog/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "ai-apis"], editions: BOTH }),
  src({ id: "azure-updates", name: "Azure updates", publisher: "Microsoft", url: "https://www.microsoft.com/releasecommunications/api/v2/azure/rss", format: "rss", tier: 1, sourceType: "changelog", topics: ["cloud"], editions: TECH }),
  src({ id: "firebase-blog", name: "The Firebase Blog", publisher: "Google", url: "https://firebase.blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "data"], editions: TECH }),
  src({ id: "fly-blog", name: "The Fly Blog", publisher: "Fly.io", url: "https://fly.io/blog/feed.xml", format: "atom", tier: 1, sourceType: "announcement", topics: ["cloud"], editions: TECH }),
  src({ id: "stripe-blog", name: "Stripe Blog", publisher: "Stripe", url: "https://stripe.com/blog/feed.rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["cloud", "developer-tools"], editions: TECH }),

  // ── Databases and data platforms ──
  src({ id: "postgresql-news", name: "PostgreSQL News", publisher: "PostgreSQL Global Development Group", url: "https://www.postgresql.org/news.rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),
  src({ id: "neon-blog", name: "Neon Blog", publisher: "Neon", url: "https://neon.com/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["data", "cloud"], editions: TECH }),
  src({ id: "planetscale-blog", name: "PlanetScale Blog", publisher: "PlanetScale", url: "https://planetscale.com/blog/feed.atom", format: "atom", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),
  src({ id: "prisma-blog", name: "Prisma Blog", publisher: "Prisma", url: "https://www.prisma.io/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["data", "developer-tools"], editions: TECH }),
  src({ id: "redis-blog", name: "Redis Blog", publisher: "Redis", url: "https://redis.io/blog/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),
  src({ id: "mongodb-blog", name: "MongoDB Blog", publisher: "MongoDB", url: "https://www.mongodb.com/company/blog/rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),
  src({ id: "clickhouse-blog", name: "ClickHouse Blog", publisher: "ClickHouse", url: "https://clickhouse.com/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),
  src({ id: "duckdb-blog", name: "DuckDB News", publisher: "DuckDB Foundation", url: "https://duckdb.org/feed.xml", format: "atom", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),
  src({ id: "elastic-blog", name: "Elastic Blog", publisher: "Elastic", url: "https://www.elastic.co/blog/feed", format: "rss", tier: 1, sourceType: "announcement", topics: ["data"], editions: TECH }),

  // ── Frameworks and UI libraries ──
  src({ id: "nextjs-blog", name: "Next.js Blog", publisher: "Vercel", url: "https://nextjs.org/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "nextjs-releases", name: "Next.js releases", publisher: "Vercel", url: "https://github.com/vercel/next.js/releases.atom", format: "atom", tier: 1, sourceType: "repository", topics: ["frameworks"], editions: TECH, note: "Canary releases are noise: only stable releases and security patches are stories." }),
  src({ id: "react-blog", name: "React Blog", publisher: "React", url: "https://react.dev/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "react-releases", name: "React releases", publisher: "React", url: "https://github.com/facebook/react/releases.atom", format: "atom", tier: 1, sourceType: "repository", topics: ["frameworks"], editions: TECH }),
  src({ id: "react-native-blog", name: "React Native Blog", publisher: "React Native", url: "https://reactnative.dev/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "expo-changelog", name: "Expo Changelog", publisher: "Expo", url: "https://expo.dev/changelog/rss.xml", format: "rss", tier: 1, sourceType: "changelog", topics: ["frameworks"], editions: TECH }),
  src({ id: "vue-blog", name: "The Vue Point", publisher: "Vue.js", url: "https://blog.vuejs.org/feed.rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "angular-blog", name: "Angular Blog", publisher: "Angular", url: "https://blog.angular.dev/feed", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "svelte-blog", name: "Svelte Blog", publisher: "Svelte", url: "https://svelte.dev/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "astro-blog", name: "Astro Blog", publisher: "Astro", url: "https://astro.build/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),
  src({ id: "vite-blog", name: "Vite Blog", publisher: "Vite", url: "https://vite.dev/blog.rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks", "developer-tools"], editions: TECH }),
  src({ id: "tailwind-blog", name: "Tailwind CSS Blog", publisher: "Tailwind Labs", url: "https://tailwindcss.com/feeds/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["frameworks"], editions: TECH }),

  // ── Runtimes and languages ──
  src({ id: "nodejs-blog", name: "Node.js Blog", publisher: "OpenJS Foundation", url: "https://nodejs.org/en/feed/blog.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "nodejs-releases", name: "Node.js releases", publisher: "OpenJS Foundation", url: "https://nodejs.org/en/feed/releases.xml", format: "rss", tier: 1, sourceType: "changelog", topics: ["runtimes"], editions: TECH }),
  src({ id: "deno-blog", name: "Deno Blog", publisher: "Deno", url: "https://deno.com/feed", format: "atom", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "bun-blog", name: "Bun Blog", publisher: "Bun", url: "https://bun.sh/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "typescript-blog", name: "TypeScript Blog", publisher: "Microsoft", url: "https://devblogs.microsoft.com/typescript/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "rust-blog", name: "Rust Blog", publisher: "The Rust Foundation", url: "https://blog.rust-lang.org/feed.xml", format: "atom", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "python-blog", name: "Python Insider", publisher: "Python Software Foundation", url: "https://blog.python.org/feeds/posts/default", format: "rss", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "go-blog", name: "The Go Blog", publisher: "Go", url: "https://go.dev/blog/feed.atom", format: "atom", tier: 1, sourceType: "announcement", topics: ["runtimes"], editions: TECH }),
  src({ id: "v8-blog", name: "V8 Blog", publisher: "V8", url: "https://v8.dev/blog.atom", format: "atom", tier: 1, sourceType: "announcement", topics: ["runtimes", "web-platform"], editions: TECH }),
  src({ id: "kernel-releases", name: "Linux kernel releases", publisher: "The Linux Kernel Organization", url: "https://www.kernel.org/feeds/kdist.xml", format: "rss", tier: 1, sourceType: "changelog", topics: ["runtimes"], editions: TECH }),

  // ── Browsers, platforms and standards ──
  src({ id: "chrome-developers", name: "Chrome for Developers Blog", publisher: "Google", url: "https://developer.chrome.com/static/blog/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform"], editions: TECH }),
  src({ id: "web-dev", name: "web.dev Blog", publisher: "Google", url: "https://web.dev/static/blog/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform"], editions: TECH }),
  src({ id: "webkit-blog", name: "WebKit Blog", publisher: "Apple", url: "https://webkit.org/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform"], editions: TECH }),
  src({ id: "mozilla-hacks", name: "Mozilla Hacks", publisher: "Mozilla", url: "https://hacks.mozilla.org/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform"], editions: TECH }),
  src({ id: "mozilla-blog", name: "The Mozilla Blog", publisher: "Mozilla", url: "https://blog.mozilla.org/en/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform", "policy"], editions: TECH }),
  src({ id: "w3c-news", name: "W3C News", publisher: "World Wide Web Consortium", url: "https://www.w3.org/news/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform", "policy"], editions: TECH }),
  src({ id: "whatwg-blog", name: "The WHATWG Blog", publisher: "WHATWG", url: "https://blog.whatwg.org/feed", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform", "policy"], editions: TECH }),
  src({ id: "ietf-blog", name: "IETF Blog", publisher: "Internet Engineering Task Force", url: "https://www.ietf.org/blog/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform", "policy"], editions: TECH }),
  src({ id: "android-developers", name: "Android Developers Blog", publisher: "Google", url: "https://developer.android.com/static/blog/atom.xml", format: "atom", tier: 1, sourceType: "announcement", topics: ["web-platform", "developer-tools"], editions: TECH }),
  src({ id: "apple-developer-news", name: "Apple Developer News", publisher: "Apple", url: "https://developer.apple.com/news/rss/news.rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform", "developer-tools"], editions: TECH }),
  src({ id: "windows-blogs", name: "Windows Blogs", publisher: "Microsoft", url: "https://blogs.windows.com/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["web-platform", "hardware"], editions: TECH }),
  src({ id: "google-developers-blog", name: "Google Developers Blog", publisher: "Google", url: "https://developers.googleblog.com/feeds/posts/default/", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "ai-apis"], editions: BOTH }),

  // ── Developer tools and infrastructure ──
  src({ id: "docker-blog", name: "Docker Blog", publisher: "Docker", url: "https://www.docker.com/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools"], editions: TECH }),
  src({ id: "kubernetes-blog", name: "Kubernetes Blog", publisher: "The Kubernetes Authors", url: "https://kubernetes.io/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "cloud"], editions: TECH }),
  src({ id: "cncf-blog", name: "CNCF Blog", publisher: "Cloud Native Computing Foundation", url: "https://www.cncf.io/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "cloud"], editions: TECH }),
  src({ id: "linux-foundation-blog", name: "Linux Foundation Blog", publisher: "The Linux Foundation", url: "https://www.linuxfoundation.org/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "policy"], editions: TECH }),
  src({ id: "meta-engineering", name: "Engineering at Meta", publisher: "Meta", url: "https://engineering.fb.com/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "ai-labs"], editions: BOTH }),
  src({ id: "mcp-releases", name: "Model Context Protocol releases", publisher: "Model Context Protocol", url: "https://github.com/modelcontextprotocol/modelcontextprotocol/releases.atom", format: "atom", tier: 1, sourceType: "repository", topics: ["developer-tools", "ai-apis"], editions: BOTH }),
  src({ id: "ollama-blog", name: "Ollama Blog", publisher: "Ollama", url: "https://ollama.com/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["developer-tools", "ai-apis"], editions: BOTH }),

  // ── AI labs ──
  src({ id: "openai-news", name: "OpenAI News", publisher: "OpenAI", url: "https://openai.com/news/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs"], editions: AI }),
  src({ id: "anthropic-news", name: "Anthropic Newsroom", publisher: "Anthropic", url: "https://www.anthropic.com/news", format: "html", tier: 1, sourceType: "announcement", topics: ["ai-labs"], editions: AI }),
  src({ id: "anthropic-engineering", name: "Anthropic Engineering", publisher: "Anthropic", url: "https://www.anthropic.com/engineering", format: "html", tier: 1, sourceType: "announcement", topics: ["ai-labs", "developer-tools"], editions: BOTH }),
  src({ id: "google-deepmind", name: "Google DeepMind Blog", publisher: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs", "research"], editions: AI }),
  src({ id: "google-ai-blog", name: "Google — AI", publisher: "Google", url: "https://blog.google/innovation-and-ai/technology/ai/rss/", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs"], editions: AI }),
  src({ id: "google-research", name: "Google Research Blog", publisher: "Google", url: "https://research.google/blog/rss/", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs", "research"], editions: AI }),
  src({ id: "meta-ai", name: "Meta AI Blog", publisher: "Meta", url: "https://ai.meta.com/blog/", format: "html", tier: 1, sourceType: "announcement", topics: ["ai-labs"], editions: AI }),
  src({ id: "meta-newsroom", name: "Meta Newsroom", publisher: "Meta", url: "https://about.fb.com/news/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs", "hardware"], editions: BOTH }),
  src({ id: "mistral-news", name: "Mistral AI News", publisher: "Mistral AI", url: "https://mistral.ai/news/", format: "html", tier: 1, sourceType: "announcement", topics: ["ai-labs"], editions: AI }),
  src({ id: "microsoft-blog", name: "The Official Microsoft Blog", publisher: "Microsoft", url: "https://blogs.microsoft.com/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs", "cloud"], editions: BOTH }),
  src({ id: "microsoft-research", name: "Microsoft Research", publisher: "Microsoft", url: "https://www.microsoft.com/en-us/research/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs", "research"], editions: AI }),
  src({ id: "apple-ml-research", name: "Apple Machine Learning Research", publisher: "Apple", url: "https://machinelearning.apple.com/rss.xml", format: "rss", tier: 1, sourceType: "research-paper", topics: ["ai-labs", "research"], editions: AI }),
  src({ id: "huggingface-blog", name: "Hugging Face Blog", publisher: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-labs", "developer-tools"], editions: BOTH, note: "Primary only for Hugging Face's own products and releases; community posts are commentary." }),
  src({ id: "together-blog", name: "Together AI Blog", publisher: "Together AI", url: "https://www.together.ai/blog/rss.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["ai-apis"], editions: AI }),
  src({ id: "groq-blog", name: "Groq Blog", publisher: "Groq", url: "https://groq.com/blog", format: "html", tier: 1, sourceType: "announcement", topics: ["ai-apis", "hardware"], editions: BOTH }),
  src({ id: "openrouter-blog", name: "OpenRouter Blog", publisher: "OpenRouter", url: "https://openrouter.ai/blog/", format: "html", tier: 1, sourceType: "announcement", topics: ["ai-apis"], editions: AI }),

  // ── API changelogs and release notes of model providers ──
  src({ id: "openai-api-changelog", name: "OpenAI API changelog", publisher: "OpenAI", url: "https://developers.openai.com/api/docs/changelog", format: "html", tier: 1, sourceType: "changelog", topics: ["ai-apis"], editions: AI }),
  src({ id: "claude-release-notes", name: "Claude Developer Platform release notes", publisher: "Anthropic", url: "https://platform.claude.com/docs/en/release-notes/overview", format: "html", tier: 1, sourceType: "changelog", topics: ["ai-apis"], editions: AI }),
  src({ id: "gemini-api-changelog", name: "Gemini API changelog", publisher: "Google", url: "https://aistudio.google.com/docs/changelog", format: "html", tier: 1, sourceType: "changelog", topics: ["ai-apis"], editions: AI }),
  src({ id: "xai-release-notes", name: "xAI API release notes", publisher: "xAI", url: "https://docs.x.ai/developers/release-notes", format: "html", tier: 1, sourceType: "changelog", topics: ["ai-apis"], editions: AI }),
  src({ id: "deepseek-updates", name: "DeepSeek API updates", publisher: "DeepSeek", url: "https://api-docs.deepseek.com/updates/", format: "html", tier: 1, sourceType: "changelog", topics: ["ai-apis"], editions: AI }),

  // ── Hardware ──
  src({ id: "nvidia-blog", name: "NVIDIA Blog", publisher: "NVIDIA", url: "https://blogs.nvidia.com/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["hardware", "ai-labs"], editions: BOTH }),
  src({ id: "nvidia-newsroom", name: "NVIDIA Newsroom", publisher: "NVIDIA", url: "https://nvidianews.nvidia.com/releases.xml", format: "rss", tier: 1, sourceType: "announcement", topics: ["hardware"], editions: BOTH }),
  src({ id: "nvidia-developer-blog", name: "NVIDIA Technical Blog", publisher: "NVIDIA", url: "https://developer.nvidia.com/blog/feed", format: "atom", tier: 1, sourceType: "announcement", topics: ["hardware", "developer-tools"], editions: TECH }),
  src({ id: "amd-newsroom", name: "AMD Newsroom", publisher: "AMD", url: "https://newsroom.amd.com/", format: "html", tier: 1, sourceType: "announcement", topics: ["hardware"], editions: TECH }),
  src({ id: "amd-press-releases", name: "AMD press releases", publisher: "AMD", url: "https://ir.amd.com/news-events/press-releases/rss", format: "rss", tier: 1, sourceType: "announcement", topics: ["hardware"], editions: TECH }),
  src({ id: "arm-newsroom", name: "Arm Newsroom", publisher: "Arm", url: "https://newsroom.arm.com/feed", format: "rss", tier: 1, sourceType: "announcement", topics: ["hardware"], editions: TECH }),
  src({ id: "apple-newsroom", name: "Apple Newsroom", publisher: "Apple", url: "https://www.apple.com/newsroom/rss-feed.rss", format: "atom", tier: 1, sourceType: "announcement", topics: ["hardware"], editions: TECH }),
  src({ id: "raspberry-pi-news", name: "Raspberry Pi News", publisher: "Raspberry Pi", url: "https://www.raspberrypi.com/news/feed/", format: "rss", tier: 1, sourceType: "announcement", topics: ["hardware"], editions: TECH }),

  // ── Research ──
  src({ id: "arxiv-cs-ai", name: "arXiv — Artificial Intelligence (cs.AI)", publisher: "arXiv", url: "https://rss.arxiv.org/rss/cs.AI", format: "rss", tier: 1, sourceType: "research-paper", topics: ["research"], editions: AI, note: "A preprint is primary for what its authors claim, not proof that the claim holds: say it is a preprint and whether it was peer reviewed." }),
  src({ id: "arxiv-cs-lg", name: "arXiv — Machine Learning (cs.LG)", publisher: "arXiv", url: "https://rss.arxiv.org/rss/cs.LG", format: "rss", tier: 1, sourceType: "research-paper", topics: ["research"], editions: AI, note: "Same rule as cs.AI." }),
  src({ id: "arxiv-cs-cl", name: "arXiv — Computation and Language (cs.CL)", publisher: "arXiv", url: "https://rss.arxiv.org/rss/cs.CL", format: "rss", tier: 1, sourceType: "research-paper", topics: ["research"], editions: AI, note: "Same rule as cs.AI." }),
  src({ id: "arxiv-api", name: "arXiv API", publisher: "arXiv", url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=1", format: "atom", tier: 1, sourceType: "research-paper", topics: ["research"], editions: AI, note: "For looking up one paper by id; the example query is only what was fetched to verify the endpoint." }),

  // ── Security advisories and public bodies ──
  src({ id: "cisa-advisories", name: "CISA Cybersecurity Advisories", publisher: "Cybersecurity and Infrastructure Security Agency", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", format: "rss", tier: 1, sourceType: "regulatory", topics: ["security", "policy"], editions: BOTH }),
  src({ id: "nist-news", name: "NIST News", publisher: "National Institute of Standards and Technology", url: "https://www.nist.gov/news-events/news/rss.xml", format: "rss", tier: 1, sourceType: "regulatory", topics: ["policy", "security"], editions: BOTH }),
  src({ id: "github-advisories", name: "GitHub Advisory Database", publisher: "GitHub", url: "https://github.com/advisories", format: "html", tier: 1, sourceType: "documentation", topics: ["security"], editions: TECH, note: "Primary for the advisory record; the vendor's own notice is still required for what was fixed and when." }),

  // ══ TIER 2 — TRUSTED TECHNICAL PRESS ═══════════════════════════════════════
  src({ id: "ars-technica", name: "Ars Technica", publisher: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", format: "rss", tier: 2, sourceType: "reporting", topics: ["press"], editions: BOTH }),
  src({ id: "ars-technica-ai", name: "Ars Technica — AI", publisher: "Ars Technica", url: "https://arstechnica.com/ai/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "ai-labs"], editions: AI }),
  src({ id: "the-register", name: "The Register", publisher: "The Register", url: "https://www.theregister.com/headlines.atom", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "cloud"], editions: BOTH }),
  src({ id: "the-verge", name: "The Verge", publisher: "The Verge", url: "https://www.theverge.com/rss/index.xml", format: "atom", tier: 2, sourceType: "reporting", topics: ["press"], editions: BOTH }),
  src({ id: "techcrunch", name: "TechCrunch", publisher: "TechCrunch", url: "https://techcrunch.com/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press"], editions: BOTH }),
  src({ id: "wired", name: "WIRED", publisher: "WIRED", url: "https://www.wired.com/feed/rss", format: "rss", tier: 2, sourceType: "reporting", topics: ["press"], editions: BOTH }),
  src({ id: "mit-technology-review", name: "MIT Technology Review", publisher: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "research"], editions: BOTH }),
  src({ id: "ieee-spectrum", name: "IEEE Spectrum", publisher: "IEEE", url: "https://spectrum.ieee.org/feeds/feed.rss", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "hardware"], editions: BOTH }),
  src({ id: "infoq", name: "InfoQ", publisher: "InfoQ", url: "https://feed.infoq.com/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "developer-tools"], editions: TECH }),
  src({ id: "the-new-stack", name: "The New Stack", publisher: "The New Stack", url: "https://thenewstack.io/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "cloud", "developer-tools"], editions: TECH }),
  src({ id: "lwn", name: "LWN.net", publisher: "LWN.net", url: "https://lwn.net/headlines/rss", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "runtimes"], editions: TECH }),
  src({ id: "phoronix", name: "Phoronix", publisher: "Phoronix", url: "https://www.phoronix.com/rss.php", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "hardware", "runtimes"], editions: TECH }),
  src({ id: "toms-hardware", name: "Tom's Hardware", publisher: "Tom's Hardware", url: "https://www.tomshardware.com/feeds.xml", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "hardware"], editions: TECH }),
  src({ id: "semianalysis", name: "SemiAnalysis", publisher: "SemiAnalysis", url: "https://semianalysis.com/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "hardware"], editions: BOTH, note: "Analysis with estimates: attribute every figure to SemiAnalysis as an estimate, never as a fact." }),
  src({ id: "bleepingcomputer", name: "BleepingComputer", publisher: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "security"], editions: TECH }),
  src({ id: "krebs-on-security", name: "Krebs on Security", publisher: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "security"], editions: TECH }),
  src({ id: "404-media", name: "404 Media", publisher: "404 Media", url: "https://www.404media.co/rss/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press"], editions: BOTH }),
  src({ id: "rest-of-world", name: "Rest of World", publisher: "Rest of World", url: "https://restofworld.org/feed/latest", format: "rss", tier: 2, sourceType: "reporting", topics: ["press"], editions: BOTH }),
  src({ id: "stack-overflow-blog", name: "Stack Overflow Blog", publisher: "Stack Overflow", url: "https://stackoverflow.blog/feed/", format: "rss", tier: 2, sourceType: "reporting", topics: ["press", "developer-tools"], editions: TECH, note: "Primary only for Stack Overflow's own announcements and surveys." }),
  // Spanish-language press: context and regional angle for the Spanish edition.
  src({ id: "xataka", name: "Xataka", publisher: "Xataka", url: "https://www.xataka.com/feedburner.xml", format: "rss", tier: 2, sourceType: "reporting", lang: "es", topics: ["press"], editions: BOTH }),
  src({ id: "genbeta", name: "Genbeta", publisher: "Genbeta", url: "https://www.genbeta.com/feedburner.xml", format: "rss", tier: 2, sourceType: "reporting", lang: "es", topics: ["press", "developer-tools"], editions: BOTH }),
  src({ id: "hipertextual", name: "Hipertextual", publisher: "Hipertextual", url: "https://hipertextual.com/feed/", format: "rss", tier: 2, sourceType: "reporting", lang: "es", topics: ["press"], editions: BOTH }),
  src({ id: "el-pais-tecnologia", name: "El País — Tecnología", publisher: "El País", url: "https://elpais.com/rss/tecnologia/portada.xml", format: "rss", tier: 2, sourceType: "reporting", lang: "es", topics: ["press"], editions: BOTH }),
  src({ id: "infobae-tecno", name: "Infobae — Tecno", publisher: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/", format: "rss", tier: 2, sourceType: "reporting", lang: "es", topics: ["press"], editions: BOTH }),

  // ══ TIER 3 — DISCOVERY ONLY (never cited) ══════════════════════════════════
  // The site's own RSS (news.ycombinator.com/rss) and x.ai/news answer a browser but refuse automated
  // clients (HTTP 419 / 403 on 2026-11-11), so they are not listed: see docs/editorial/sources.md "Left out".
  src({ id: "hacker-news-api", name: "Hacker News API — top stories", publisher: "Y Combinator", url: "https://hacker-news.firebaseio.com/v0/topstories.json", format: "json", tier: 3, sourceType: "other", topics: ["discovery"], editions: BOTH }),
  src({ id: "hnrss-frontpage", name: "hnrss — Hacker News front page with points", publisher: "hnrss.org", url: "https://hnrss.org/frontpage", format: "rss", tier: 3, sourceType: "other", topics: ["discovery"], editions: BOTH }),
  src({ id: "lobsters", name: "Lobsters", publisher: "Lobsters", url: "https://lobste.rs/rss", format: "rss", tier: 3, sourceType: "other", topics: ["discovery"], editions: TECH }),
  src({ id: "techmeme", name: "Techmeme", publisher: "Techmeme", url: "https://www.techmeme.com/feed.xml", format: "rss", tier: 3, sourceType: "other", topics: ["discovery"], editions: BOTH }),
  src({ id: "github-trending", name: "GitHub Trending", publisher: "GitHub", url: "https://github.com/trending", format: "html", tier: 3, sourceType: "other", topics: ["discovery", "developer-tools"], editions: TECH }),
  src({ id: "huggingface-papers", name: "Hugging Face — Daily Papers", publisher: "Hugging Face", url: "https://huggingface.co/papers", format: "html", tier: 3, sourceType: "other", topics: ["discovery", "research"], editions: AI }),
  src({ id: "product-hunt", name: "Product Hunt", publisher: "Product Hunt", url: "https://www.producthunt.com/feed", format: "atom", tier: 3, sourceType: "other", topics: ["discovery"], editions: TECH }),
  src({ id: "reddit-programming", name: "r/programming", publisher: "Reddit", url: "https://www.reddit.com/r/programming/.rss", format: "atom", tier: 3, sourceType: "other", topics: ["discovery"], editions: TECH }),
  src({ id: "simon-willison", name: "Simon Willison's Weblog", publisher: "Simon Willison", url: "https://simonwillison.net/atom/everything/", format: "atom", tier: 3, sourceType: "other", topics: ["discovery", "ai-apis"], editions: BOTH, note: "An individual's commentary: an excellent pointer to primary sources, not one of them." }),
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function sourcesByTier(tier: SourceTier, edition?: "ai" | "tech"): EditorialSource[] {
  return EDITORIAL_SOURCES.filter((s) => s.tier === tier && (!edition || s.editions.includes(edition)));
}

export function sourcesForEdition(edition: "ai" | "tech"): EditorialSource[] {
  return EDITORIAL_SOURCES.filter((s) => s.editions.includes(edition));
}

export function sourceCounts(): Record<SourceTier, number> {
  return { 1: sourcesByTier(1).length, 2: sourcesByTier(2).length, 3: sourcesByTier(3).length };
}

/** Distinct publishers of a tier, alphabetical — what the public page lists. */
export function publishersByTier(tier: SourceTier): string[] {
  return Array.from(new Set(sourcesByTier(tier).map((s) => s.publisher))).sort((a, b) => a.localeCompare(b));
}

/** Host of a source URL, for display ("blog.cloudflare.com"). */
export function sourceHost(s: Pick<EditorialSource, "url">): string {
  try {
    return new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    return s.url;
  }
}
