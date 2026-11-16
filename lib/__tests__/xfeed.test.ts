// v1.8.7 — Promptea's own X feed (lib/social, components/home/XFeed.tsx), replacing
// the Elfsight widget: URL and text sanitizing, the Buffer and oEmbed sources, the
// server wiring (source order, empty state), the card's markup and the card order.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));

import {
  canonicalTweetUrl,
  decodeEntities,
  displayUrl,
  htmlToText,
  linkify,
  MAX_POSTS,
  MAX_TEXT_CHARS,
  normalizePosts,
  relativeDate,
  safeHref,
  sanitizeText,
  tweetIdFromUrl,
  FEED_REVALIDATE_SECONDS,
  type XPost,
} from "@/lib/social/feed";
import { BUFFER_API_URL, bufferGraphql, fetchBufferPosts, fetchOrganizationId, postsFromBuffer, postsQuery } from "@/lib/social/sources/buffer";
import { fetchOembedPosts, parseOembedHtml, parsePostUrlList } from "@/lib/social/sources/oembed";
import { LANGS } from "@/lib/domain";

const root = join(__dirname, "..", "..");
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");
const dict = (l: string) => JSON.parse(read("app", "[lang]", "dictionaries", `${l}.json`));

const ORG = "69816b6b059d5765f84e3100".replace(/./g, (c, i) => (i % 2 ? c : "a")); // any 24-hex id
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// A real oEmbed answer for one of Promptea's posts (2026-11-16), as X returns it.
const OEMBED_HTML =
  '<blockquote class="twitter-tweet" data-dnt="true"><p lang="en" dir="ltr">Before the prompt, write one sentence: what should this answer help me do?<br><br>Context, constraints and format all follow from that goal.<br><br>Promptea helps you fill in the rest.<a href="https://t.co/BRQ5WInLK3">https://t.co/BRQ5WInLK3</a><a href="https://x.com/hashtag/PromptEngineering?src=hash&amp;ref_src=twsrc%5Etfw">#PromptEngineering</a> <a href="https://x.com/hashtag/AI?src=hash&amp;ref_src=twsrc%5Etfw">#AI</a></p>&mdash; Promptea (@Promptea_me) <a href="https://x.com/Promptea_me/status/2121986625492160994?ref_src=twsrc%5Etfw">November 15, 2026</a></blockquote>\n\n';

describe("tweet URLs", () => {
  test("only x.com / twitter.com status links give an id", () => {
    expect(tweetIdFromUrl("https://x.com/Promptea_me/status/2121986625492160994")).toBe("2121986625492160994");
    // Buffer's externalLink uses the numeric account id as the path segment.
    expect(tweetIdFromUrl("https://x.com/1683587543692877825/status/2121986625492160994")).toBe("2121986625492160994");
    expect(tweetIdFromUrl("https://twitter.com/promptea/status/1234567890?s=20")).toBe("1234567890");
    expect(tweetIdFromUrl("https://mobile.twitter.com/promptea/statuses/1234567890/photo/1")).toBe("1234567890");
    expect(tweetIdFromUrl("https://x.com/i/web/status/1234567890")).toBe("1234567890");
    for (const bad of [
      "https://evil.example/promptea/status/1234567890",
      "https://x.com.evil.example/promptea/status/1234567890",
      "https://user:pass@x.com/promptea/status/1234567890",
      "javascript:alert(1)//x.com/a/status/1234567890",
      "https://x.com/promptea",
      "https://x.com/promptea/status/abc",
      "",
      null,
    ]) {
      expect(tweetIdFromUrl(bad as string)).toBeNull();
    }
  });

  test("links are rebuilt canonically from the id (never echoed back)", () => {
    expect(canonicalTweetUrl("123456", "promptea_me")).toBe("https://x.com/promptea_me/status/123456");
    expect(canonicalTweetUrl("123456", null)).toBe("https://x.com/i/status/123456");
  });
});

describe("text", () => {
  test("plain text: control and bidi characters removed, line breaks normalized, length capped", () => {
    expect(sanitizeText("a\r\nb\u0000c‮d​")).toBe("a\nbcd");
    expect(sanitizeText("one\n\n\n\n\ntwo  \n")).toBe("one\n\ntwo");
    expect(sanitizeText(42)).toBe("");
    const long = sanitizeText("word ".repeat(400));
    expect(long.length).toBeLessThanOrEqual(MAX_TEXT_CHARS + 1);
    expect(long.endsWith("…")).toBe(true);
  });

  test("HTML in a post stays text: React escapes it and linkify never makes a link of it", () => {
    const segs = linkify('<img src=x onerror=alert(1)> <a href="javascript:alert(1)">x</a>');
    expect(segs.every((s) => s.kind === "text")).toBe(true);
    expect(segs.map((s) => s.text).join("")).toContain("<img");
  });

  test("entities and the oEmbed blockquote become text, with a space before glued links", () => {
    expect(decodeEntities("a &amp; b &lt;c&gt; &#8212; &#x2014; &mdash;")).toBe("a & b <c> — — —");
    expect(htmlToText("rest.<a href='https://t.co/x'>https://t.co/x</a><a>#AI</a>")).toBe("rest. https://t.co/x #AI");
  });
});

describe("links inside a post", () => {
  test("https URLs become links with a short label; http and other schemes stay text", () => {
    const segs = linkify("See https://www.promptea.me/en/guides/prompt-checklist. And http://example.com and javascript:alert(1)");
    const links = segs.filter((s) => s.kind === "link");
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ href: "https://www.promptea.me/en/guides/prompt-checklist", text: "promptea.me/en/guides/prompt-ch…" });
    // The sentence's full stop is not part of the URL.
    expect(segs.map((s) => s.text).join("")).toContain("prompt-ch…. And http://example.com");
  });

  test("#hashtags and @mentions link to x.com; e-mails and URL fragments do not", () => {
    const segs = linkify("Hi @promptea_me #PromptEngineering, mail me@example.com or see https://a.example/#frag");
    const links = segs.filter((s) => s.kind === "link").map((s) => (s.kind === "link" ? s.href : ""));
    expect(links).toEqual(["https://x.com/promptea_me", "https://x.com/hashtag/PromptEngineering", "https://a.example/#frag"]);
  });

  test("safeHref accepts only https without credentials", () => {
    expect(safeHref("https://promptea.me")).toBe("https://promptea.me/");
    expect(safeHref("http://promptea.me")).toBeNull();
    expect(safeHref("https://u:p@promptea.me")).toBeNull();
    expect(safeHref("https://localhost")).toBeNull();
    expect(displayUrl("https://www.promptea.me/")).toBe("promptea.me");
  });
});

describe("posts", () => {
  const p = (id: string, createdAt: string, text = "t"): XPost => ({ id, url: canonicalTweetUrl(id, "x"), text, createdAt });

  test("newest first, one per id, empty texts and bad dates dropped, capped", () => {
    const out = normalizePosts([p("1", "2026-11-10T00:00:00Z"), p("2", "2026-11-12T00:00:00Z"), p("2", "2026-11-12T00:00:00Z"), p("3", "nope"), p("4", "2026-11-11T00:00:00Z", "")]);
    expect(out.map((x) => x.id)).toEqual(["2", "1"]);
    const many = Array.from({ length: 30 }, (_, i) => p(String(100 + i), new Date(Date.UTC(2026, 10, 1, i)).toISOString()));
    expect(normalizePosts(many)).toHaveLength(MAX_POSTS);
  });

  test("relative dates are localized in every language; old posts show the date", () => {
    const now = Date.parse("2026-11-16T12:00:00Z");
    expect(relativeDate("2026-11-16T10:00:00Z", now, "en-US")).toBe("2 hr. ago");
    expect(relativeDate("2026-11-16T10:00:00Z", now, "es-AR")).toMatch(/hace 2 h/);
    expect(relativeDate("2026-11-15T10:00:00Z", now, "pt-BR")).toBe("ontem");
    expect(relativeDate("2026-10-01T10:00:00Z", now, "en-US")).toBe("Oct 1");
    // oEmbed only knows the day: never "2 h ago" for it.
    expect(relativeDate("2026-11-16T12:00:00Z", now, "en-US", true)).toBe("Nov 16");
  });

  test("a refresh at most every 2 hours (Buffer's free plan: 1,000 calls a month per channel)", () => {
    expect(FEED_REVALIDATE_SECONDS).toBe(7200);
    expect((30 * 24 * 3600) / FEED_REVALIDATE_SECONDS).toBeLessThan(500);
  });
});

describe("Buffer source", () => {
  // The shape of Buffer's posts (as its API returned them for Promptea on 2026-11-16).
  const data = {
    posts: {
      edges: [
        { node: { id: "a1", status: "sent", channelService: "twitter", text: "Older post #AI", sentAt: "2026-11-14T14:15:09.820Z", externalLink: "https://x.com/1683587543692877825/status/2121620000000000000" } },
        { node: { id: "a2", status: "sent", channelService: "twitter", text: "Newest post\r\n\r\nhttps://promptea.me", sentAt: "2026-11-15T15:20:11.080Z", externalLink: "https://x.com/1683587543692877825/status/2121986625492160994" } },
        { node: { id: "a3", status: "sent", channelService: "linkedin", text: "Not on X", sentAt: "2026-11-15T15:20:11.080Z", externalLink: "https://www.linkedin.com/feed/update/1" } },
        { node: { id: "a4", status: "scheduled", channelService: "twitter", text: "Not sent yet", dueAt: "2026-11-17T15:20:00.000Z", externalLink: null } },
        { node: { id: "a5", status: "sent", channelService: "twitter", text: "Sent but no link yet", sentAt: "2026-11-15T15:20:11.080Z", externalLink: null } },
      ],
    },
  };

  test("only sent posts on X with a status link become posts, newest first, with canonical URLs", () => {
    const posts = postsFromBuffer(data, "promptea_me", Date.parse("2026-11-16T00:00:00Z"));
    expect(posts.map((p) => p.url)).toEqual(["https://x.com/promptea_me/status/2121986625492160994", "https://x.com/promptea_me/status/2121620000000000000"]);
    expect(posts[0].text).toBe("Newest post\n\nhttps://promptea.me");
    expect(postsFromBuffer({ nope: 1 }, null)).toEqual([]);
  });

  test("the query asks for sent posts newest first, scoped to the organization (and channel when set)", () => {
    expect(postsQuery(false)).toMatch(/filter: \{ status: \[sent\] \}/);
    expect(postsQuery(false)).toMatch(/sort: \[\{ field: dueAt, direction: desc \}\]/);
    expect(postsQuery(true)).toMatch(/channelIds: \$channels/);
    expect(postsQuery(false)).toMatch(/externalLink/);
  });

  test("the key travels only in the Authorization header", async () => {
    const fetchImpl = vi.fn(async () => json(200, { data }));
    const r = await fetchBufferPosts({ apiKey: " secret-key ", fetchImpl }, { organizationId: ORG, handle: "promptea_me" });
    expect(r.ok && r.posts).toHaveLength(2);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(BUFFER_API_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
    expect(String(init.body)).not.toContain("secret-key");
    expect(JSON.parse(String(init.body)).variables).toEqual({ org: ORG, first: 20 });
  });

  test("failures are typed, never thrown", async () => {
    const cases: Array<[() => Promise<Response>, string]> = [
      [async () => json(401, {}), "unauthorized"],
      [async () => json(200, { errors: [{ message: "x", extensions: { code: "UNAUTHENTICATED" } }] }), "unauthorized"],
      [async () => json(429, {}), "rate_limited"],
      [async () => json(500, { errors: [{ message: "boom" }] }), "upstream_error"],
      [async () => json(200, { errors: [{ message: "Cannot query field" }] }), "invalid_response"],
      [async () => new Response("<html>", { status: 200 }), "invalid_response"],
      [async () => Promise.reject(new TypeError("fetch failed")), "upstream_error"],
      [async () => Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" })), "timeout"],
    ];
    for (const [impl, reason] of cases) {
      const r = await bufferGraphql({ apiKey: "k", fetchImpl: vi.fn(impl) }, "query { x }");
      expect(r, reason).toMatchObject({ ok: false, reason });
    }
    expect(await bufferGraphql({ apiKey: "  " }, "query { x }")).toMatchObject({ ok: false, reason: "not_configured" });
    expect(await fetchBufferPosts({ apiKey: "k" }, { organizationId: "not-an-id", handle: null })).toMatchObject({ ok: false, reason: "not_configured" });
  });

  test("the organization is the account's first one", async () => {
    const ok = await fetchOrganizationId({ apiKey: "k", fetchImpl: vi.fn(async () => json(200, { data: { account: { organizations: [{ id: ORG }] } } })) });
    expect(ok).toEqual({ ok: true, id: ORG });
    const none = await fetchOrganizationId({ apiKey: "k", fetchImpl: vi.fn(async () => json(200, { data: { account: { organizations: [] } } })) });
    expect(none).toMatchObject({ ok: false, reason: "invalid_response" });
  });
});

describe("oEmbed source", () => {
  test("the post's text and day come out of the blockquote as plain text", () => {
    const r = parseOembedHtml(OEMBED_HTML);
    expect(r?.text).toBe("Before the prompt, write one sentence: what should this answer help me do?\n\nContext, constraints and format all follow from that goal.\n\nPromptea helps you fill in the rest. https://t.co/BRQ5WInLK3 #PromptEngineering #AI");
    expect(r?.date).toBe("2026-11-15T12:00:00.000Z");
    expect(parseOembedHtml("<blockquote>no paragraph</blockquote>")).toBeNull();
  });

  test("the URL list keeps unique status ids, at most 10", () => {
    const list = "https://x.com/a/status/111111, https://x.com/a/status/111111 https://evil.example/a/status/222222\nhttps://twitter.com/a/status/333333";
    expect(parsePostUrlList(list)).toEqual(["111111", "333333"]);
    expect(parsePostUrlList(Array.from({ length: 15 }, (_, i) => `https://x.com/a/status/${100000 + i}`).join(","))).toHaveLength(10);
    expect(parsePostUrlList(undefined)).toEqual([]);
  });

  test("only Promptea's own posts are accepted; X's script is never requested", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const own = url.includes("2121986625492160994");
      if (url.includes("999999")) return json(404, {});
      return json(200, { author_url: own ? "https://x.com/Promptea_me" : "https://x.com/someone_else", html: OEMBED_HTML });
    });
    const r = await fetchOembedPosts({ fetchImpl: fetchImpl as unknown as typeof fetch }, ["2121986625492160994", "555555", "999999"], "promptea_me");
    expect(r.ok && r.posts.map((p) => p.url)).toEqual(["https://x.com/Promptea_me/status/2121986625492160994"]);
    expect(r.ok && r.posts[0].dateOnly).toBe(true);
    for (const [url] of fetchImpl.mock.calls as unknown as [string][]) {
      expect(url).toMatch(/^https:\/\/publish\.x\.com\/oembed\?url=/);
      expect(url).toMatch(/omit_script=1/);
    }
  });
});

describe("server wiring (source order, empty state)", () => {
  const env = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    for (const k of ["BUFFER_API_KEY", "BUFFER_ORGANIZATION_ID", "BUFFER_X_CHANNEL_ID", "X_FEED_POST_URLS", "X_FEED_DEV_FIXTURE"]) delete process.env[k];
    process.env.NEXT_PUBLIC_X_HANDLE = "promptea_me";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  test("no source configured → no request at all, an empty feed (the card shows its call to action)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getXFeed } = await import("@/lib/social/server");
    expect(await getXFeed()).toMatchObject({ source: "none", posts: [], reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("Buffer first; when it fails and a URL list exists, oEmbed takes over", async () => {
    process.env.BUFFER_API_KEY = "k";
    process.env.BUFFER_ORGANIZATION_ID = ORG;
    process.env.X_FEED_POST_URLS = "https://x.com/promptea_me/status/2121986625492160994";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url === BUFFER_API_URL ? json(401, {}) : json(200, { author_url: "https://x.com/Promptea_me", html: OEMBED_HTML })))
    );
    const { getXFeed } = await import("@/lib/social/server");
    const feed = await getXFeed();
    expect(feed.source).toBe("oembed");
    expect(feed.posts).toHaveLength(1);
  });

  test("Buffer down and no list → an empty feed, never a throw", async () => {
    process.env.BUFFER_API_KEY = "k";
    process.env.BUFFER_ORGANIZATION_ID = ORG;
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const { getXFeed } = await import("@/lib/social/server");
    expect(await getXFeed()).toMatchObject({ source: "buffer", posts: [], reason: "upstream_error" });
  });

  test("the fictitious fixture exists only in development", async () => {
    process.env.X_FEED_DEV_FIXTURE = "1";
    vi.stubGlobal("fetch", vi.fn());
    const { getXFeed } = await import("@/lib/social/server");
    // vitest runs with NODE_ENV=test: the fixture is not used.
    expect((await getXFeed()).source).toBe("none");
  });
});

describe("the card", () => {
  const src = read("components", "home", "XFeed.tsx");
  // The code only (the header comment tells the card's history, Elfsight included).
  const code = src.replace(/^\s*\/\/.*$/gm, "");

  test("a server component with no third-party script, frame or image", () => {
    expect(code).not.toMatch(/^"use client"/m);
    expect(code).not.toMatch(/<script|<iframe|<img|next\/script|platform\.twitter|widgets\.js|elfsight/i);
    expect(code).toMatch(/LINK_REL = "noopener noreferrer nofollow"/);
    expect(code).toMatch(/style=\{\{ height: FEED_HEIGHT \}\}/);
    expect(code).toMatch(/role="region"/);
  });

  test("the empty state is the call to action, never an error", () => {
    expect(code).toMatch(/dict\.empty/);
    expect(code).toMatch(/btn btn-primary/);
    expect(code).not.toMatch(/reason/);
  });

  test("every language carries the card's strings; Elfsight is gone from the dictionaries and the privacy page", () => {
    for (const lang of LANGS) {
      const x = dict(lang).hub.xFeed;
      for (const k of ["title", "subtitle", "follow", "open", "viewPost", "listLabel", "empty", "note"]) expect(x[k], `${lang}.${k}`).toBeTruthy();
      expect(x.listLabel).toContain("{handle}");
      expect(JSON.stringify(dict(lang))).not.toMatch(/elfsight/i);
    }
    expect(read("app", "[lang]", "privacy", "page.tsx")).not.toMatch(/elfsight/i);
  });

  test("no trace of Elfsight in the code, styles, config, scripts or README (its script, classes, env var)", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(join(root, dir))) {
        const rel = join(dir, f);
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.(tsx?|mjs|css|json)$/.test(f) && !rel.includes("__tests__")) files.push(rel);
      }
    };
    for (const d of ["app", "components", "lib", "scripts"]) walk(d);
    files.push("next.config.ts", "README.md");
    const hits = files.filter((f) => /elfsightcdn|elfsight-app|eapps-twitter|ELFSIGHT|DEFAULT_X_WIDGET_ID|getXWidgetId/.test(read(f)));
    expect(hits).toEqual([]);
  });
});

describe("side column order: newsletter first, X below", () => {
  test("home: the newsletter card comes before the X feed in the side column", () => {
    const home = read("app", "[lang]", "page.tsx");
    const aside = home.slice(home.indexOf("<aside"));
    expect(aside.indexOf('newsletter("home-newsletter-title")')).toBeGreaterThan(0);
    expect(aside.indexOf("<XFeed")).toBeGreaterThan(aside.indexOf('newsletter("home-newsletter-title")'));
    // On phones the newsletter sits right after the stories, i.e. before the side column (and its X card).
    expect(home.indexOf('newsletter("home-newsletter-title-inline")')).toBeLessThan(home.indexOf("<aside"));
  });

  test("AI Daily: the X feed goes inside the dock, which renders the newsletter card first", () => {
    const view = read("components", "blog", "BlogIndexView.tsx");
    expect(view).toMatch(/<NewsletterDock[^>]*>\s*<XFeed/);
    const dock = read("components", "newsletter", "NewsletterDock.tsx");
    expect(dock.indexOf("<SubscribeForm")).toBeLessThan(dock.lastIndexOf("{children}"));
  });
});
