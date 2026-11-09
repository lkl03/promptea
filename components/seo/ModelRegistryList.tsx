// components/seo/ModelRegistryList.tsx
//
// "Current models" for one AI family, read from the verified model registry
// (lib/models.ts): what each model is for, its context window and limits, the
// capabilities Promptea relies on, how the provider recommends prompting it,
// and the date + source of the verification. Server-rendered, so the facts are
// in the HTML. Nothing is typed here: a registry update updates this section.

import { currentModels, modelSummary } from "@/lib/seo/facts";
import { formatDay } from "@/lib/seo/dates";
import type { TargetAI } from "@/lib/domain";
import type { Locale } from "@/lib/seo/site";

const yes = (lang: Locale, v: boolean) => (v ? (lang === "es" ? "sí" : "yes") : "no");

export default function ModelRegistryList({ target, lang }: { target: TargetAI; lang: Locale }) {
  const models = currentModels(target);
  if (models.length === 0) return null;
  const es = lang === "es";

  return (
    <section aria-labelledby="current-models-title" className="mt-10">
      <h2 id="current-models-title" className="text-sm font-medium">
        {es ? "Modelos vigentes que soporta Promptea" : "Current models Promptea supports"}
      </h2>
      <p className="mt-1 text-xs opacity-70">
        {es
          ? "Datos tomados de la documentación oficial de cada proveedor; cada ficha indica la fecha de su última verificación."
          : "Data taken from each provider’s official documentation; every entry shows the date it was last verified."}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {models.map((m) => {
          const s = modelSummary(m, lang);
          return (
            <article key={s.id} className="surface space-y-3 p-4">
              <header className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{s.label}</h3>
                {s.default ? <span className="badge badge-accent">{es ? "por defecto" : "default"}</span> : null}
                {s.status === "preview" ? <span className="badge badge-info">preview</span> : null}
              </header>
              <p className="text-sm opacity-85">{s.note}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="opacity-70">{es ? "Contexto" : "Context window"}</dt>
                <dd>{s.context} tokens</dd>
                <dt className="opacity-70">{es ? "Salida máxima" : "Max output"}</dt>
                <dd>{s.maxOutput} tokens</dd>
                <dt className="opacity-70">{es ? "Entrada / salida" : "Input / output"}</dt>
                <dd>
                  {s.inputs} / {s.outputs}
                </dd>
                <dt className="opacity-70">{es ? "Latencia" : "Latency"}</dt>
                <dd>{s.latency}</dd>
                <dt className="opacity-70">{es ? "Salida estructurada" : "Structured output"}</dt>
                <dd>{yes(lang, s.structuredOutput)}</dd>
                <dt className="opacity-70">{es ? "Herramientas / búsqueda nativa" : "Tool use / native search"}</dt>
                <dd>
                  {yes(lang, s.toolUse)} / {yes(lang, s.nativeSearch)}
                </dd>
              </dl>
              {s.promptGuidance ? (
                <p className="text-xs leading-relaxed opacity-85">
                  <strong className="font-medium">{es ? "Cómo promptearlo: " : "How to prompt it: "}</strong>
                  {s.promptGuidance}
                </p>
              ) : null}
              <p className="text-[11px] opacity-60">
                {es ? "Verificado el " : "Verified on "}
                {formatDay(s.verifiedAt, lang)} ·{" "}
                <a href={s.sourceUrl} rel="noreferrer noopener" target="_blank" className="underline-offset-2 hover:underline">
                  {es ? "fuente oficial" : "official source"}
                </a>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
