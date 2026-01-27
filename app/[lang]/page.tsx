import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import PromptBox from "@/components/PromptBox";
import AdSlot from "@/components/AdSlot";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as "es" | "en");

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
            <PromptBox dict={dict} lang={lang as "es" | "en"} />
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



