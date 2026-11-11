// app/[lang]/blog/tech/page.tsx
//
// v1.8.3 — AI Daily Tech: one technology story a day, always tied to AI or to
// software development (cloud and hosting platforms, web frameworks and
// runtimes, developer tools, hardware). Its own crawlable URL with its own
// title, description, canonical, feed, filters and pagination; the list itself
// is the shared index (components/blog/BlogIndexView.tsx) narrowed to the
// `tech-daily` edition.
//
// The stories exist in English and Spanish. /pt/blog/tech shows the English
// ones with the translated notice and canonicalises to /en/blog/tech — the same
// rule as the AI index since v1.8.2.

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { hasLocale } from "../../dictionaries";
import BlogIndexView, { blogIndexMetadata, type BlogSearchParams } from "@/components/blog/BlogIndexView";
import { toLang } from "@/lib/domain";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<BlogSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  return blogIndexMetadata(toLang(lang), await searchParams, "tech");
}

export default async function BlogTechIndexPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <BlogIndexView lang={toLang(lang)} sp={await searchParams} section="tech" />;
}
