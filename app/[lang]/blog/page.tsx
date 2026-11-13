// app/[lang]/blog/page.tsx
//
// The AI Daily index: the AI section (both daily slots and the weekly
// editions). v1.4.1 made it filterable, v1.4.2 rebuilt it as a publication
// rather than a query console; since v1.8.3 the implementation is shared with
// the Tech section (/blog/tech) and lives in components/blog/BlogIndexView.tsx.

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { hasLocale } from "../dictionaries";
import BlogIndexView, { blogIndexMetadata, type BlogSearchParams } from "@/components/blog/BlogIndexView";
import { toLang } from "@/lib/domain";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<BlogSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  return blogIndexMetadata(toLang(lang), await searchParams, "ai");
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <BlogIndexView lang={toLang(lang)} sp={await searchParams} section="ai" />;
}
