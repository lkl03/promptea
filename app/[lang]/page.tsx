import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import PromptBox from "@/components/PromptBox";
import AdSlot from "@/components/AdSlot";

type TargetValue = "gpt" | "gemini" | "grok" | "claude" | "kimi" | "deepseek";
type PromptPurpose = "text" | "study" | "code" | "data_json" | "image" | "marketing";

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

function normalizeTarget(v: string | null): TargetValue | undefined {
  const x = (v ?? "").toLowerCase().trim();
  const allowed: TargetValue[] = ["gpt", "gemini", "grok", "claude", "kimi", "deepseek"];
  return (allowed.includes(x as any) ? (x as TargetValue) : undefined);
}

function normalizePurpose(v: string | null): PromptPurpose | undefined {
  const x = (v ?? "").toLowerCase().trim();

  // compat aliases por si linkeás "data" o "json"
  if (x === "data" || x === "json" || x === "data/json") return "data_json";

  const allowed: PromptPurpose[] = ["text", "study", "code", "data_json", "image", "marketing"];
  return (allowed.includes(x as any) ? (x as PromptPurpose) : undefined);
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

  const initialPrompt = rawPrompt ? safeDecode(rawPrompt).slice(0, 6000) : "";
  const initialPurpose = normalizePurpose(rawPurpose);
  const initialTarget = normalizeTarget(rawTarget);

  const showAds = process.env.NEXT_PUBLIC_ENABLE_ADS === "true";

  return (
    <main className="px-4 pb-10 pt-8 sm:pt-10">
      <div
        className={[
          "mx-auto grid w-full gap-8 xl:gap-10",
          showAds
            ? "grid-cols-1 xl:grid-cols-[320px_minmax(0,1180px)_320px] 2xl:grid-cols-[320px_minmax(0,1320px)_320px] 3xl:grid-cols-[320px_minmax(0,1480px)_320px]"
            : "grid-cols-1 max-w-5xl 2xl:max-w-6xl",
        ].join(" ")}
      >
        {/* Center */}
        <section className={showAds ? "xl:col-start-2" : ""}>
          <header className="text-center">
            <h1 className="font-title text-4xl font-semibold tracking-tight sm:text-5xl">
              {dict.app.title}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm opacity-80 sm:text-base">
              {dict.app.subtitle}
            </p>
          </header>

          <div className="mt-8">
            <PromptBox dict={dict} lang={lang as "es" | "en"}  
              initialPrompt={initialPrompt}
              initialPurpose={initialPurpose}
              initialTarget={initialTarget} />
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
      </div>
    </main>
  );
}



