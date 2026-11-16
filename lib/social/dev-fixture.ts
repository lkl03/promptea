// lib/social/dev-fixture.ts
//
// v1.8.7 — clearly fictitious posts to review the X feed card locally without a
// Buffer key (X_FEED_DEV_FIXTURE=1, development only; lib/social/server.ts never
// reads this in a production build). The ids are not real posts.

import { canonicalTweetUrl, normalizePosts, type XFeedResult } from "./feed";

const H = 3_600_000;

export function devFixtureFeed(handle: string | null, now = Date.now()): XFeedResult {
  const texts: Array<[number, string]> = [
    [0.4, "[FIXTURE] Before the prompt, write one sentence: what should this answer help me do?\n\nContext, constraints and format all follow from that goal.\n\nhttps://promptea.me\n\n#PromptEngineering #AI"],
    [26, "[FIXTURE] One giant prompt, one muddled answer. Break the job into steps: outline, draft, edit.\n\nhttps://www.promptea.me/en/guides/prompt-checklist #ChatGPTTips"],
    [50, "[FIXTURE] Paste a prompt into the analyzer: it flags what's wrong and writes an optimized version for the model you use. Thanks @someone for the idea."],
    [75, "[FIXTURE] Skip the doomscroll: one verified AI story a day.\n\nhttps://www.promptea.me/en/blog\n\n#AINews"],
    [170, "[FIXTURE] A very long post to check wrapping and the length cap: " + "lorem ipsum dolor sit amet ".repeat(30)],
    [400, "[FIXTURE] An http:// link is shown as text, not linked: http://example.com/insecure — and javascript:alert(1) stays text too."],
  ];
  const posts = texts.map(([hoursAgo, text], i) => {
    const id = `19900000000000000${10 + i}`;
    return { id, url: canonicalTweetUrl(id, handle), text: text.length > 600 ? `${text.slice(0, 599)}…` : text, createdAt: new Date(now - hoursAgo * H).toISOString() };
  });
  return { source: "fixture", posts: normalizePosts(posts), reason: null, fetchedAt: new Date(now).toISOString() };
}
