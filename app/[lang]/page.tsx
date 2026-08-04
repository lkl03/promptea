import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import PromptBox from "@/components/PromptBox";
import AdSlot from "@/components/AdSlot";
import PromptOfTheDay from "@/components/PromptOfTheDay";
import HowItWorks from "@/components/HowItWorks";
import ModeSwitcher from "@/components/ModeSwitcher";

// v1.2.0: types + normalization come from the shared domain module, so URL
// prefill supports every purpose (translation/summarization were silently
// dropped before) and can never drift from PromptBox or the API schema.
import { isPurpose, isTarget, normalizePurpose as normalizePurposeAlias, type PromptPurpose, type TargetAI } from "@/lib/domain";

function pickFirst(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeTarget(v: string | null): TargetAI | undefined {
  const x = (v ?? "").toLowerCase().trim();
  return isTarget(x) ? x : undefined;
}

function normalizePurpose(v: string | null): PromptPurpose | undefined {
  if (!v) return undefined;
  const normalized = normalizePurposeAlias(v);
  // normalizePurposeAlias falls back to "text" for unknown values; only
  // prefill when the URL actually named a valid purpose or alias.
  const x = v.toLowerCase().trim();
  const wasAlias = ["data_json", "json", "data/json", "translate", "summary", "summarize"].includes(x);
  return isPurpose(x) || wasAlias ? normalized : undefined;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as "es" | "en");

  const sp = (await searchParams) ?? {};
  const rawPrompt = pickFirst(sp.prompt);
  const rawPurpose = pickFirst(sp.purpose);
  const rawTarget = pickFirst(sp.target);
  const rawModel = pickFirst(sp.model);

  const initialPrompt = rawPrompt ? safeDecode(rawPrompt).slice(0, 6000) : "";
  const initialPurpose = normalizePurpose(rawPurpose);
  const initialTarget = normalizeTarget(rawTarget);
  const initialModelId = rawModel ? safeDecode(rawModel).slice(0, 80) : undefined;
  // v1.3.0 matcher → optimizer handoff: the payload travels via
  // sessionStorage (promptea:handoff); the flag just tells PromptBox to read it.
  const handoff = pickFirst(sp.handoff) === "1";

  const showAds = process.env.NEXT_PUBLIC_ENABLE_ADS === "true";

  return (
    <main className="px-4 pb-10 pt-8 sm:pt-10">
      <div
        className={[
          "mx-auto grid w-full gap-8 xl:gap-10",
          showAds
            ? "grid-cols-1 xl:grid-cols-[320px_minmax(0,1180px)_320px] 2xl:grid-cols-[320px_minmax(0,1320px)_320px] 3xl:grid-cols-[320px_minmax(0,1480px)_320px]"
            : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] xl:max-w-6xl 2xl:max-w-7xl",
        ].join(" ")}
      >
        {/* Center */}
        <section className={showAds ? "xl:col-start-2" : ""}>
          <header className="text-center">
            <h1 className="font-title text-4xl font-semibold tracking-tight sm:text-5xl">{dict.app.title}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm opacity-80 sm:text-base">{dict.app.subtitle}</p>
            <div className="mt-3 flex justify-center">
              <HowItWorks lang={lang as "es" | "en"} />
            </div>
          </header>

          <div className="mt-6">
            <ModeSwitcher lang={lang as "es" | "en"} active="improve" dict={dict.mode} />
          </div>

          {/* Mobile: Prompt of the Day above the analyzer */}
          <div className="mt-6 xl:hidden">
            <PromptOfTheDay lang={lang as "es" | "en"} />
          </div>

          <div className="mt-8">
            <PromptBox
              dict={dict}
              lang={lang as "es" | "en"}
              initialPrompt={initialPrompt}
              initialPurpose={initialPurpose}
              initialTarget={initialTarget}
              initialModelId={initialModelId}
              handoff={handoff}
            />
          </div>
        </section>

        {/* Ad: izquierda en XL+ (solo si enabled) */}
        {showAds && (
          <aside className="xl:col-start-1 xl:row-start-1 xl:justify-self-end xl:sticky xl:top-24">
            <div className="mx-auto w-full max-w-[320px] xl:mx-0">
              <AdSlot label={dict.app.ad} />
            </div>
          </aside>
        )}

        {/* Sticky Prompt of the Day (desktop only when ads disabled) */}
        {!showAds && (
          <aside className="hidden xl:block xl:row-start-1 xl:col-start-2">
            <div className="xl:sticky xl:top-24">
              <PromptOfTheDay lang={lang as "es" | "en"} />
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}




