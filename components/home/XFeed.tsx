// components/home/XFeed.tsx
//
// The X feed card (home side column, AI Daily side column).
//
// v1.8.7 — Promptea's own feed. A SERVER component: the posts of the account
// are fetched on the server (lib/social/server.ts → Buffer, or X's oEmbed JSON
// for a list of URLs), cached, and rendered here as plain markup. The browser
// loads no script, image, font or frame from X or anyone else: it gets text
// and links. So the card is crawlable, works without JavaScript, has no
// layout shift, follows the three themes, and costs nothing per view.
//
// History: v1.8.0 embedded X's timeline widget (it stopped rendering); v1.8.1–
// v1.8.6 used an Elfsight widget (third-party script, a paid plan near its
// limit). Decision record: docs/release/v1.8.7/x-feed-decision.md.
//
// States:
//   posts     a compact list (newest first, at most MAX_POSTS) in a box of fixed
//             height that scrolls inside (keyboard-focusable region); each post
//             with its relative date and a link to it on x.com; under it the
//             primary "Follow us on X" button.
//   empty     no source configured, the source failed, or nothing published
//             yet: one sentence and the same primary button to the profile.
//             Never an error message, never a broken card.
// Links in posts are built from the text (lib/social/feed.ts → linkify: https
// URLs, #hashtags, @mentions only) and open in a new tab with
// rel="noopener noreferrer nofollow".

import { getXFeed } from "@/lib/social/server";
import { fullDate, linkify, relativeDate, type XPost } from "@/lib/social/feed";
import { INTL_LOCALE, type Lang } from "@/lib/domain";

export type XFeedDict = {
  title: string;
  subtitle: string;
  follow: string;
  open: string;
  viewPost: string;
  listLabel: string;
  empty: string;
  note: string;
};

/** Fixed height (px) of the posts box: the card never changes size, so nothing shifts. */
export const FEED_HEIGHT = 420;
const LINK_REL = "noopener noreferrer nofollow";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.5 22H3.4l7.3-8.4L1 2h6.4l4.4 5.6L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
    </svg>
  );
}

function PostText({ text }: { text: string }) {
  return (
    <p className="x-post-text">
      {linkify(text).map((s, i) =>
        s.kind === "link" ? (
          <a key={i} href={s.href} target="_blank" rel={LINK_REL} className="x-post-link">
            {s.text}
          </a>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </p>
  );
}

function Post({ post, lang, now, handle, dict }: { post: XPost; lang: Lang; now: number; handle: string | null; dict: XFeedDict }) {
  const locale = INTL_LOCALE[lang];
  const when = relativeDate(post.createdAt, now, locale, post.dateOnly);
  const full = fullDate(post.createdAt, locale, post.dateOnly);
  return (
    <li className="x-post">
      <article aria-label={`${handle ? `@${handle}` : "X"} · ${full}`}>
        <p className="x-post-meta">
          <span className="font-semibold text-ink">Promptea</span>
          {handle ? <span> @{handle}</span> : null}
          <span aria-hidden="true"> · </span>
          <time dateTime={post.createdAt} title={full}>
            {when}
          </time>
        </p>
        <PostText text={post.text} />
        <a href={post.url} target="_blank" rel={LINK_REL} className="x-post-open">
          {dict.viewPost}
          <span className="sr-only"> ({full})</span>
          <span aria-hidden="true"> ↗</span>
        </a>
      </article>
    </li>
  );
}

export default async function XFeed({ lang, handle, profileUrl, dict }: { lang: Lang; handle: string | null; profileUrl: string; dict: XFeedDict }) {
  const feed = await getXFeed();
  // Relative dates are computed when the page is rendered (it revalidates every few minutes).
  const now = new Date().getTime();
  const posts = feed.posts;
  const follow = (
    <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary h-10 w-full gap-2 px-4 text-sm">
      <XIcon className="h-3.5 w-3.5 shrink-0" />
      {dict.follow}
    </a>
  );

  return (
    <section aria-labelledby="xfeed-title" className="x-feed surface p-4 sm:p-5" data-x-feed={posts.length ? feed.source : "empty"}>
      {/* Title and handle share a row when they fit; in a narrow column the handle wraps under the title. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="xfeed-title" className="flex items-center gap-2 whitespace-nowrap font-title text-lg font-semibold">
          <XIcon className="h-4 w-4 shrink-0" />
          {dict.title}
        </h2>
        {handle ? (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-8 shrink-0 px-3 text-xs">
            @{handle}
            <span className="sr-only"> — {dict.open.replace("{handle}", handle)}</span>
          </a>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-ink-muted">{dict.subtitle}</p>

      {posts.length ? (
        <>
          {/* Fixed height in every case: the posts scroll inside, the page never moves. */}
          <div
            className="x-feed-box x-feed-scroll mt-3 overflow-y-auto overscroll-contain rounded-xl border border-line"
            style={{ height: FEED_HEIGHT }}
            role="region"
            aria-label={handle ? dict.listLabel.replace("{handle}", handle) : dict.title}
            tabIndex={0}
          >
            <ol className="m-0 list-none p-0">
              {posts.map((p) => (
                <Post key={p.id} post={p} lang={lang} now={now} handle={handle} dict={dict} />
              ))}
            </ol>
          </div>
          <div className="mt-3">{follow}</div>
        </>
      ) : (
        <div className="x-feed-empty mt-3 rounded-xl border border-line p-4">
          <p className="text-sm leading-relaxed text-ink-muted">{dict.empty}</p>
          <div className="mt-3">{follow}</div>
        </div>
      )}

      {posts.length ? <p className="mt-2 text-[11px] leading-snug text-ink-muted">{dict.note.replace("@{handle}", handle ? `@${handle}` : "X")}</p> : null}
    </section>
  );
}
