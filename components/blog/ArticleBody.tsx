// components/blog/ArticleBody.tsx
//
// v1.4.0 — renders an AI Daily article body.
//
// SECURITY: there is deliberately no dangerouslySetInnerHTML anywhere on this
// path. A block carries plain text; parseInline() turns `**bold**` and
// `[label](https://url)` into typed tokens, and every token becomes a real
// React element. React escapes text nodes, so a stored `<script>` renders as
// visible characters instead of executing. Link hrefs are re-validated as
// https inside parseInline — anything else degrades to plain text.

import { Fragment } from "react";

import { parseInline } from "@/lib/blog/render";
import type { Block } from "@/lib/blog/types";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, i) => {
        if (token.kind === "bold") {
          return (
            <strong key={i} className="font-semibold">
              {token.value}
            </strong>
          );
        }
        if (token.kind === "link") {
          return (
            <a
              key={i}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 decoration-from-font hover:opacity-80 transition-opacity"
            >
              {token.value}
            </a>
          );
        }
        return <Fragment key={i}>{token.value}</Fragment>;
      })}
    </>
  );
}

export default function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={i} className="font-title text-xl sm:text-2xl font-semibold pt-3">
                <Inline text={block.text} />
              </h2>
            ) : (
              <h3 key={i} className="font-title text-base sm:text-lg font-semibold pt-2">
                <Inline text={block.text} />
              </h3>
            );

          case "list":
            return block.ordered ? (
              <ol key={i} className="list-decimal pl-5 space-y-1.5 text-sm sm:text-base opacity-90">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm sm:text-base opacity-90">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );

          case "quote":
            return (
              <blockquote key={i} className="surface-soft p-4 border-l-4">
                <p className="text-sm sm:text-base italic opacity-90">
                  <Inline text={block.text} />
                </p>
                {block.attribution ? (
                  <footer className="mt-2 text-xs opacity-70 not-italic">— {block.attribution}</footer>
                ) : null}
              </blockquote>
            );

          case "paragraph":
          default:
            return (
              <p key={i} className="text-sm sm:text-base leading-relaxed opacity-90">
                <Inline text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
