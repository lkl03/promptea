// lib/blog/latest.ts
//
// v1.8.3 — which stories the home page's "Latest in AI Daily" block shows now
// that AI Daily has two sections (AI and Tech).
//
// Decision: ONE mixed block, not a second lane.
//   - The home was rebuilt in v1.8.1 to fit in ~1,900 px; a second block for
//     Tech would push Benchmarks and the newsletter further down for one story
//     a day.
//   - The lead (the big card) is always an AI story: the block is called "AI
//     Daily" and the top slot keeps that promise.
//   - The row under it is newest-first across both sections, with AT MOST ONE
//     Tech story, labelled "Tech": with one Tech story and up to two AI stories
//     a day, an uncapped mix would let Tech take a third of the block or, on a
//     quiet AI day, all of it.
//   - When there is no AI story at all (a brand-new or empty AI archive) the
//     newest Tech story leads rather than showing an empty block.
//
// Pure (no Firestore), so the rules are tested exactly.

import { sectionOfEdition } from "@/lib/domain";
import type { BlogEdition } from "@/lib/domain";

export const HOME_LATEST_COUNT = 4;
export const HOME_LATEST_MAX_TECH = 1;

/**
 * `articles` must be newest first (the order every read path returns). Returns
 * at most `count` of them: the lead first, then the row.
 */
export function selectHomeLatest<T extends { edition: BlogEdition | string }>(
  articles: readonly T[],
  count: number = HOME_LATEST_COUNT,
  maxTech: number = HOME_LATEST_MAX_TECH
): T[] {
  if (count <= 0 || articles.length === 0) return [];
  const isTech = (a: T) => sectionOfEdition(a.edition) === "tech";

  const leadIndex = articles.findIndex((a) => !isTech(a));
  // No AI story at all: the newest stories lead as they come (still capped below).
  const lead = leadIndex === -1 ? articles[0] : articles[leadIndex];

  const out: T[] = [lead];
  let tech = isTech(lead) ? 1 : 0;
  for (const a of articles) {
    if (out.length >= count) break;
    if (a === lead) continue;
    if (isTech(a)) {
      if (tech >= maxTech) continue;
      tech++;
    }
    out.push(a);
  }
  return out;
}

/** True when at least one Tech story is among `articles` (the home then links to the Tech index). */
export function hasTechStory(articles: readonly { edition: BlogEdition | string }[]): boolean {
  return articles.some((a) => sectionOfEdition(a.edition) === "tech");
}
